// ─────────────────────────────────────────────────────────────────────────────
// mangoAI.ts
// Intelligent Conversational AI Assistant Engine for Wholesale of Oklahoma
// Personality: Mango 🐕, a friendly Golden Retriever store assistant.
// ─────────────────────────────────────────────────────────────────────────────

import { GoogleGenAI } from '@google/genai';
import {
  PRODUCTS,
  getProduct,
  getWholesalePrice,
  type WholesaleProduct,
} from './productDatabase';
import type { InventoryItem } from '../types/inventory';

export interface ChatMessage {
  id?: string;
  role: 'user' | 'model';
  text: string;
  timestamp?: number;
  toolResults?: MangoToolResult[];
}

export interface DraftOrderItem {
  product: WholesaleProduct;
  quantity: number;
  flavor?: string;
  pricePerUnit: number;
  totalPrice: number;
}

export interface MangoToolResult {
  type: 'order_summary' | 'order_updated';
  orderItems?: DraftOrderItem[];
  orderTotal?: number;
}

// ─── Global In-Memory & LocalStorage Draft Order State ────────────────────────

const CART_STORAGE_KEY = 'woo_wholesale_cart';

function loadCartFromStorage(): DraftOrderItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function persistCart(items: DraftOrderItem[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore storage quota errors
  }
}

let draftOrder: DraftOrderItem[] = loadCartFromStorage();

export function getDraftOrder(): DraftOrderItem[] {
  return draftOrder;
}

export function getDraftOrderTotal(): number {
  return (
    Math.round(
      draftOrder.reduce((sum, item) => sum + item.totalPrice, 0) * 100
    ) / 100
  );
}

export function clearDraftOrder(): void {
  draftOrder = [];
  persistCart(draftOrder);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mango-cart-updated'));
  }
}

export function openWebpageCart(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('open-cart'));
    window.dispatchEvent(new CustomEvent('open-mango-cart'));
  }
}

// ─── Direct Cart Modification API (Used by Inventory & Best Sellers) ─────────

export function addToOrderDirect(
  productOrId: string | WholesaleProduct | InventoryItem,
  quantity: number,
  flavor?: string,
  priceOverride?: number,
  imageOverride?: string
): { success: boolean; message: string } {
  let product: WholesaleProduct | undefined;
  let pricePerUnit = priceOverride ?? 0;
  let imageUrl = imageOverride;

  if (typeof productOrId === 'string') {
    product = getProduct(productOrId);
    if (!product) {
      const q = productOrId.toLowerCase().trim();
      product = PRODUCTS.find(
        (p) =>
          p.id.toLowerCase() === q ||
          p.sku.toLowerCase() === q ||
          p.name.toLowerCase() === q
      );
    }
  } else if ('rate' in productOrId) {
    const invItem = productOrId as InventoryItem;
    const match =
      getProduct(invItem.id) ||
      getProduct(invItem.sku) ||
      PRODUCTS.find((p) => p.name.toLowerCase() === invItem.name.toLowerCase());

    pricePerUnit =
      priceOverride !== undefined && priceOverride > 0
        ? priceOverride
        : invItem.rate > 0
        ? invItem.rate
        : match?.pricePerUnit || 0;

    imageUrl = imageOverride || invItem.image_url || match?.imageUrl;

    product = {
      id: invItem.id || invItem.sku,
      sku: invItem.sku,
      name: invItem.name,
      brand: invItem.brand || match?.brand || 'Wholesale of OK',
      category: (match?.category || invItem.category || 'General') as any,
      subcategory: (match?.subcategory || invItem.subcategory || 'General') as any,
      features: invItem.features || match?.features || [],
      flavours: invItem.variants
        ? invItem.variants.map((v) => v.variant_name)
        : match?.flavours || [],
      popular: match?.popular ?? true,
      pricePerUnit: pricePerUnit,
      basePriceRange:
        match?.basePriceRange ||
        (pricePerUnit > 0 ? `$${pricePerUnit.toFixed(2)}` : 'Call for Price'),
      inStock:
        invItem.stock_status !== 'out_of_stock' &&
        (invItem.available_stock === undefined || invItem.available_stock > 0),
      minOrderQty: invItem.min_order_qty || match?.minOrderQty || 1,
      bulkPricing: invItem.bulk_pricing || match?.bulkPricing || [
        { minQty: 1, pricePerUnit: pricePerUnit, label: '1+ units' },
      ],
      imageUrl: imageUrl,
    };
  } else {
    product = productOrId as WholesaleProduct;
    if (priceOverride !== undefined && priceOverride > 0) {
      pricePerUnit = priceOverride;
    }
    if (imageOverride) {
      imageUrl = imageOverride;
    } else if (product.imageUrl) {
      imageUrl = product.imageUrl;
    }
  }

  if (!product) {
    return { success: false, message: 'Product could not be resolved.' };
  }

  const finalQty = Math.max(1, quantity, product.minOrderQty || 1);

  // Determine pricing
  let finalUnitPrice = pricePerUnit > 0 ? pricePerUnit : product.pricePerUnit;
  if (!finalUnitPrice && product.bulkPricing && product.bulkPricing.length > 0) {
    const applicableTiers = product.bulkPricing.filter((t) => finalQty >= t.minQty);
    const tier =
      applicableTiers.length > 0
        ? applicableTiers[applicableTiers.length - 1]
        : product.bulkPricing[0];
    finalUnitPrice = tier.pricePerUnit;
  }

  const totalPrice = Math.round(finalUnitPrice * finalQty * 100) / 100;

  const existingIdx = draftOrder.findIndex(
    (i) =>
      (i.product.id === product!.id || i.product.sku === product!.sku) &&
      (i.flavor || '') === (flavor || '')
  );

  if (existingIdx >= 0) {
    const newQty = draftOrder[existingIdx].quantity + finalQty;
    const newTotalPrice = Math.round(finalUnitPrice * newQty * 100) / 100;
    draftOrder[existingIdx] = {
      ...draftOrder[existingIdx],
      quantity: newQty,
      pricePerUnit: finalUnitPrice,
      totalPrice: newTotalPrice,
      product: {
        ...draftOrder[existingIdx].product,
        imageUrl: imageUrl || draftOrder[existingIdx].product.imageUrl,
      },
    };
  } else {
    draftOrder.push({
      product: {
        ...product,
        imageUrl: imageUrl || product.imageUrl,
      },
      quantity: finalQty,
      flavor,
      pricePerUnit: finalUnitPrice,
      totalPrice: totalPrice,
    });
  }

  persistCart(draftOrder);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mango-cart-updated'));
  }

  return {
    success: true,
    message: `Added ${finalQty}x ${product.name}${flavor ? ` (${flavor})` : ''} to your draft order.`,
  };
}

export function updateOrderItemQuantity(
  productId: string,
  quantity: number,
  flavor?: string
): { success: boolean; message: string } {
  const existingIdx = draftOrder.findIndex(
    (i) =>
      (i.product.id === productId || i.product.sku === productId) &&
      (i.flavor || '') === (flavor || '')
  );

  if (existingIdx < 0) {
    return { success: false, message: 'Item not in order.' };
  }

  if (quantity <= 0) {
    draftOrder.splice(existingIdx, 1);
    persistCart(draftOrder);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('mango-cart-updated'));
    }
    return { success: true, message: 'Removed from order.' };
  }

  const item = draftOrder[existingIdx];
  const unitPrice = item.pricePerUnit;
  draftOrder[existingIdx] = {
    ...item,
    quantity,
    totalPrice: Math.round(unitPrice * quantity * 100) / 100,
  };

  persistCart(draftOrder);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mango-cart-updated'));
  }

  return { success: true, message: `Updated quantity to ${quantity}.` };
}

export function removeFromOrderDirect(
  productId: string,
  flavor?: string
): { success: boolean; message: string } {
  const before = draftOrder.length;
  draftOrder = draftOrder.filter(
    (i) =>
      !(
        (i.product.id === productId || i.product.sku === productId) &&
        (flavor === undefined || (i.flavor || '') === (flavor || ''))
      )
  );
  persistCart(draftOrder);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mango-cart-updated'));
  }
  return draftOrder.length < before
    ? { success: true, message: 'Removed from order.' }
    : { success: false, message: 'Item not in order.' };
}

// ─── Local Deterministic Fallback Engine ──────────────────────────────────
// Ensures Mango ALWAYS answers instantly without hiccups, even offline or on 503.

function handleWithLocalEngine(userText: string): { text: string; toolResults: MangoToolResult[] } {
  const q = userText.toLowerCase().trim();

  // 1. Store Location / Address
  if (
    q.includes('address') ||
    q.includes('location') ||
    q.includes('where') ||
    q.includes('located') ||
    q.includes('directions') ||
    q.includes('find you')
  ) {
    return {
      text: `Woof woof! 🐕 We are located at:\n\n📍 **4500 S Bryant Ave, Oklahoma City, OK 73135**\n\nWe are right here in Oklahoma City! You can stop by our warehouse for same-day local pickup, or call us at **(405) 768-2975** for directions or metro delivery assistance!`,
      toolResults: [],
    };
  }

  // 2. Store Hours
  if (
    q.includes('hour') ||
    q.includes('open') ||
    q.includes('close') ||
    q.includes('schedule') ||
    q.includes('time') ||
    q.includes('when are you')
  ) {
    return {
      text: `Woof! 🐕 Here are our current store & warehouse hours:\n\n⏰ **Monday – Saturday:** 9:00 AM – 8:00 PM\n⏰ **Sunday:** 11:00 AM – 8:00 PM\n\nFeel free to call us at **(405) 768-2975** or drop in anytime during these hours!`,
      toolResults: [],
    };
  }

  // 3. Contact / Phone / Email
  if (
    q.includes('phone') ||
    q.includes('call') ||
    q.includes('contact') ||
    q.includes('email') ||
    q.includes('number') ||
    q.includes('reach')
  ) {
    return {
      text: `Woof! Here is our contact info to reach our Oklahoma team directly: 🐕\n\n📞 **Phone:** (405) 768-2975\n📧 **Email:** wholesaleofoklahoma@gmail.com\n📍 **Address:** 4500 S Bryant Ave, Oklahoma City, OK 73135\n\nGive us a call anytime during business hours for quick stock checks or volume quotes!`,
      toolResults: [],
    };
  }

  // 4. Pickup / Delivery / Shipping
  if (q.includes('pickup') || q.includes('delivery') || q.includes('deliver') || q.includes('ship')) {
    return {
      text: `Woof! Yes, we offer fast Oklahoma fulfillment! 🐕\n\n• **Same-Day OKC Warehouse Pickup:** Available at 4500 S Bryant Ave, Oklahoma City.\n• **Oklahoma Metro Direct Delivery:** We deliver directly to dispensaries, vape shops, and smoke shops in the OKC metro area.\n• **Statewide Shipping:** Fast fulfillment across Oklahoma.\n\nCall **(405) 768-2975** to confirm immediate availability for today!`,
      toolResults: [],
    };
  }

  // 5. Wholesale Program / Account / How Wholesale Works / Pricing
  if (
    q.includes('wholesale') ||
    q.includes('price') ||
    q.includes('pricing') ||
    q.includes('bulk') ||
    q.includes('discount') ||
    q.includes('minimum') ||
    q.includes('account') ||
    q.includes('tier')
  ) {
    return {
      text: `Woof woof! 🐕 **Wholesale of Oklahoma** is a licensed B2B master distributor supplying dispensaries, smoke shops, and vape shops across the state!\n\n• **Tiered Volume Pricing:** The more cases you order, the higher your profit margins.\n• **No Huge Minimums:** Order from single cartons to master cases based on your store's cash flow.\n• **Phone Quotes:** Because wholesale prices fluctuate with master volume discounts, call **(405) 768-2975** for today's best rates!\n\n👉 Want to check inventory and select items? Click the **Inventory** tab above to browse and build your order!`,
      toolResults: [],
    };
  }

  // 6. Products / Catalog / What do you sell / Brands
  if (
    q.includes('product') ||
    q.includes('catalog') ||
    q.includes('inventory') ||
    q.includes('brand') ||
    q.includes('sell') ||
    q.includes('carry') ||
    q.includes('vape') ||
    q.includes('disposable') ||
    q.includes('juice') ||
    q.includes('pipe') ||
    q.includes('glass') ||
    q.includes('kratom') ||
    q.includes('thca') ||
    q.includes('delta')
  ) {
    return {
      text: `Woof! We carry full inventory across all major smoke shop and vape categories: 🐕\n\n• **Disposable Vapes:** Geekbar Pulse 15k / 25k / 60k, Raz 25k LTX, Vozol 50k, Foger 30k.\n• **Hardware & Mods:** Vaporesso XROS 4 kits, replacement pods, SMOK coils, Yocan & Cookies 510 batteries.\n• **Vape Juices:** Juice Head, Coastal Clouds, Sadboy, Twist (100ml bottles & Salt Nics).\n• **Pipes & Glass:** Heavy borosilicate beaker bongs, spoon hand pipes, silicone pipes.\n• **THCA, CBD & Delta:** THCA diamond infused pre-rolls, live resin disposables, CBD gummies.\n• **Kratom:** O.P.M.S. Gold & Black liquid extract shots, Green Maeng Da capsules.\n• **Novelties & Accessories:** 0.01g scales, grinders, torches, RAW papers, King Palm, Newport butane.\n\n👉 **To browse products with quantity selectors (1-20) and add to cart**, tap the **Inventory** tab at the top of this window, or scroll down to the **Best Sellers** section on our website!`,
      toolResults: [],
    };
  }

  // 7. Cart / Order Status Query
  if (q.includes('cart') || q.includes('my order') || q.includes('order summary') || q.includes('checkout')) {
    if (draftOrder.length === 0) {
      return {
        text: `Woof! Your wholesale cart is currently empty. 🐕\n\nTo add items, tap the **Inventory** tab at the top or click "Add to Cart" on the **Best Sellers** section on our website. When you're ready, you can submit your order request directly to our team!`,
        toolResults: [],
      };
    }
    const totalUnits = draftOrder.reduce((s, i) => s + i.quantity, 0);
    return {
      text: `Woof! You currently have **${totalUnits} units** in your draft cart across ${draftOrder.length} items. 🐕\n\nClick **View Cart** below (or tap the **Cart** button floating on your screen) to review items, adjust quantities, and send your wholesale order request directly to our dispatch team!`,
      toolResults: [
        {
          type: 'order_summary',
          orderItems: [...draftOrder],
          orderTotal: getDraftOrderTotal(),
        },
      ],
    };
  }

  // 8. Greetings
  if (
    q.includes('hello') ||
    q.includes('hi') ||
    q.includes('hey') ||
    q.includes('good morning') ||
    q.includes('good afternoon') ||
    q === 'yo'
  ) {
    return {
      text: `Hello! Woof woof! 🐕 This is Mango AI, your virtual assistant of Wholesale of Oklahoma. How can I help you today? Ask me about our location, store hours, wholesale programs, or inventory!`,
      toolResults: [],
    };
  }

  // 9. Natural Friendly AI Fallback
  return {
    text: `Woof! I'm Mango, your Wholesale of Oklahoma assistant. 🐕 I'm happy to help with anything regarding our Oklahoma City warehouse, store hours (Mon-Sat 9am-8pm, Sun 11am-8pm), wholesale options, or product lines!\n\nWhat can I assist you with today?`,
    toolResults: [],
  };
}

// ─── Gemini System Prompt ──────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are Mango 🐕, the friendly golden retriever virtual assistant for Wholesale of Oklahoma.

STORE DETAILS:
- Business: Wholesale of Oklahoma (Licensed B2B Wholesale Distributor for smoke shops, vape shops, and dispensaries)
- Address: 4500 S Bryant Ave, Oklahoma City, OK 73135
- Phone: (405) 768-2975
- Email: wholesaleofoklahoma@gmail.com
- Hours:
  • Monday – Saturday: 9:00 AM – 8:00 PM
  • Sunday: 11:00 AM – 8:00 PM
- Services: Local OKC warehouse same-day pickup, direct Oklahoma metro delivery, statewide fast fulfillment.
- Core Inventory: Disposable Vapes (Geekbar Pulse 15k/25k/60k, Raz 25k LTX, Vozol 50k, Foger 30k), Hardware & Pods (Vaporesso XROS, SMOK coils, 510 batteries), Vape Juice (Juice Head, Coastal Clouds, Sadboy, Twist), Glass & Pipes (Borosilicate beakers, hand pipes), THCA/CBD/Delta (Diamond pre-rolls, live resin disposables), Kratom (OPMS Gold/Black liquid shots, capsules), Novelties & Accessories (Digital scales, grinders, torches, RAW papers, butane).

CONVERSATION GUIDELINES:
1. Tone: Friendly, helpful, professional, approachable, slightly playful dog persona ("Woof!", "Woof woof! 🐕").
2. ALWAYS provide clear, natural conversational text answers.
3. If asked about store location or address: Always clearly provide 4500 S Bryant Ave, Oklahoma City, OK 73135 and mention same-day OKC pickup.
4. If asked about store hours: Always clearly list Monday–Saturday 9:00 AM – 8:00 PM, Sunday 11:00 AM – 8:00 PM.
5. If asked about wholesale or pricing: Explain that we are a licensed master distributor with volume tiered pricing, and suggest calling (405) 768-2975 for direct quotes.
6. DO NOT output raw add-to-cart product cards or UI drops in chat. If the user wants to browse products or add to cart, tell them to tap the "Inventory" tab at the top of the chat or check the "Best Sellers" section on the website.
7. Keep responses concise, organized with clean markdown bullets, and easy to read.`;

// ─── Main Chat Entrypoint ─────────────────────────────────────────────────

export async function sendMangoMessage(
  userText: string,
  history: ChatMessage[]
): Promise<{ text: string; toolResults: MangoToolResult[] }> {
  const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

  // If no API key configured, use local engine immediately
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return handleWithLocalEngine(userText);
  }

  // Try calling Gemini with a 3.5s timeout; fall back seamlessly if unavailable
  try {
    const ai = new GoogleGenAI({ apiKey });

    const contents = [
      ...history.slice(-4).map((msg) => ({
        role: msg.role as 'user' | 'model',
        parts: [{ text: msg.text }],
      })),
      { role: 'user' as const, parts: [{ text: userText }] },
    ];

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), 3500)
    );

    const apiPromise = (ai.models as any).generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      contents,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500,
      },
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const replyText = response.text?.trim();

    if (replyText) {
      return { text: replyText, toolResults: [] };
    }

    return handleWithLocalEngine(userText);
  } catch (err: unknown) {
    console.warn('[Mango AI Notice] Conversational fallback active:', err);
    return handleWithLocalEngine(userText);
  }
}
