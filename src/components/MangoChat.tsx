import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Send,
  ShoppingBag,
  Phone,
  MessageCircle,
  ChevronRight,
  Package,
  Search,
  Trash2,
  Check,
  Plus,
  User,
  Mail,
  Building,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
} from 'lucide-react';
import './MangoChat.css';
import {
  sendMangoMessage,
  getDraftOrder,
  getDraftOrderTotal,
  clearDraftOrder,
  addToOrderDirect,
  removeFromOrderDirect,
  type ChatMessage,
  type MangoToolResult,
  type DraftOrderItem,
} from '../lib/mangoAI';
import { PRODUCTS, type WholesaleProduct } from '../lib/productDatabase';

// ─── Sub-components ────────────────────────────────────────────────────────

const TypingIndicator: React.FC = () => (
  <div className="flex items-end gap-2 mango-msg">
    <img
      src="/mango-avatar.jpg"
      alt="Mango"
      className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
    />
    <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-neutral-100 flex items-center gap-1.5">
      <span className="mango-dot" />
      <span className="mango-dot" />
      <span className="mango-dot" />
    </div>
  </div>
);

// ─── Product Card ──────────────────────────────────────────────────────────

interface ProductCardProps {
  product: WholesaleProduct;
  onAddToOrder: (product: WholesaleProduct, qty: number) => void;
  compact?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddToOrder, compact = false }) => {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  return (
    <div className={`mango-card bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden transition-all hover:border-[#85AB8B]/40 hover:shadow-md ${compact ? 'p-3' : 'p-4'}`}>
      {/* Top badges bar */}
      <div className="flex items-center justify-between gap-1 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#85AB8B]">{product.brand}</span>
          {product.badge && (
            <span className="bg-amber-100/90 border border-amber-200 text-amber-900 text-[9px] font-black px-2 py-0.5 rounded-full shadow-2xs">
              {product.badge}
            </span>
          )}
          {product.subcategory && (
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-semibold px-1.5 py-0.5 rounded">
              {product.subcategory}
            </span>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-[11px] font-extrabold text-[#336443]">Call for Price</div>
          <div className="text-[8.5px] uppercase tracking-wider text-neutral-400">Wholesale Quote</div>
        </div>
      </div>

      {/* Title & specs */}
      <div className="mb-1.5">
        <h4 className="text-sm font-bold text-[#1f2a1d] leading-tight">{product.name}</h4>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {product.puffs && (
            <span className="bg-[#1f2a1d] text-white text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
              {product.puffs}
            </span>
          )}
          {product.size && (
            <span className="bg-[#85AB8B]/20 text-[#1f2a1d] text-[9px] font-bold px-1.5 py-0.5 rounded">
              {product.size}
            </span>
          )}
          {product.nicotine && (
            <span className="bg-neutral-100 text-neutral-600 text-[9px] font-medium px-1.5 py-0.5 rounded">
              {product.nicotine}
            </span>
          )}
          {product.inStock ? (
            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 ml-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              In Stock
            </span>
          ) : (
            <span className="text-[9px] font-semibold text-rose-500 ml-auto">Out of Stock</span>
          )}
        </div>
      </div>

      <div className="text-[10px] text-neutral-400 mb-1.5">SKU: {product.sku}</div>

      {!compact && product.flavours && product.flavours.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {product.flavours.slice(0, 4).map((f, i) => (
            <span key={i} className="text-[9px] bg-neutral-50 border border-neutral-200 text-neutral-600 px-1.5 py-0.5 rounded-md">
              {f}
            </span>
          ))}
          {product.flavours.length > 4 && (
            <span className="text-[9px] text-neutral-400">+{product.flavours.length - 4} more</span>
          )}
        </div>
      )}

      {/* Feature bullets */}
      {!compact && product.features && product.features.length > 0 && (
        <div className="text-[10px] text-neutral-500 mb-2.5 flex items-center gap-1.5 flex-wrap">
          {product.features.slice(0, 2).map((feat, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-neutral-50 px-1.5 py-0.5 rounded text-[9.5px]">
              <Check className="w-2.5 h-2.5 text-[#336443]" />
              {feat}
            </span>
          ))}
        </div>
      )}

      {product.inStock && (
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-100">
          {/* Quantity selector 1 to 20 */}
          <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded-full px-1.5 py-0.5">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-[#1f2a1d] font-bold text-xs flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer"
            >−</button>
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label="Select quantity"
              className="bg-transparent text-xs font-semibold text-[#1f2a1d] border-0 outline-none cursor-pointer px-1 py-0.5"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'unit' : 'units'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              disabled={qty >= 20}
              className="w-5 h-5 rounded-full bg-white border border-neutral-200 text-[#1f2a1d] font-bold text-xs flex items-center justify-center hover:bg-neutral-100 disabled:opacity-40 transition-colors cursor-pointer"
            >+</button>
          </div>

          {/* Add to Cart button */}
          <button
            type="button"
            onClick={() => {
              onAddToOrder(product, qty);
              setAdded(true);
              setTimeout(() => setAdded(false), 2500);
            }}
            className={`flex-1 py-1.5 text-white text-[11px] font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${added ? 'bg-emerald-600' : 'bg-[#1f2a1d] hover:bg-[#336443]'
              }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added {qty} to Cart!
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                Add to Cart
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Order Summary Bubble Card ─────────────────────────────────────────────

interface OrderSummaryProps {
  items: DraftOrderItem[];
  total: number;
  onGoToCart: () => void;
  onClear: () => void;
  onAddMore?: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ items, onGoToCart, onClear, onAddMore }) => {
  if (items.length === 0) {
    return (
      <div className="bg-neutral-50 rounded-2xl border border-neutral-200 p-4 text-center text-xs text-neutral-400">
        Your cart is empty. Ask Mango to show products!
      </div>
    );
  }

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="mango-card bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
      <div className="px-4 pt-3 pb-2 border-b border-neutral-100 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="w-3.5 h-3.5 text-[#336443]" />
          <span className="text-xs font-bold text-[#1f2a1d]">Your Wholesale Draft Cart</span>
        </div>
        <button onClick={onClear} className="text-[10px] text-neutral-400 hover:text-rose-500 transition-colors flex items-center gap-0.5 cursor-pointer">
          <Trash2 className="w-3 h-3" /> Clear Cart
        </button>
      </div>

      <div className="px-4 py-2 space-y-2 max-h-40 overflow-y-auto mango-messages-scroll">
        {items.map((item, i) => (
          <div key={i} className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-neutral-50 last:border-0">
            <div className="min-w-0">
              <span className="font-semibold text-[#1f2a1d] block truncate">{item.product.name}</span>
              {item.flavor && <span className="text-neutral-400 text-[10px]">{item.flavor}</span>}
            </div>
            <div className="text-right shrink-0">
              <span className="font-bold text-[#336443]">{item.quantity}× units</span>
              <span className="text-neutral-400 text-[10px] block">Call for Price</span>
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-3 border-t border-neutral-100 bg-neutral-50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total Items</span>
          <span className="text-base font-bold text-[#1f2a1d]">{totalUnits} units</span>
        </div>

        <div className="text-[11px] text-[#336443] font-semibold text-center mb-3 bg-emerald-50/80 py-1 px-2 rounded-lg border border-emerald-100 flex items-center justify-center gap-1">
          <Phone className="w-3 h-3" />
          <span>Call <strong>(405) 768-2975</strong> for wholesale pricing</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {onAddMore && (
            <button
              type="button"
              onClick={onAddMore}
              className="py-2 bg-white border border-neutral-200 hover:bg-neutral-100 text-[#1f2a1d] text-[11px] font-bold rounded-full transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-[#336443]" />
              Add More Items
            </button>
          )}
          <button
            type="button"
            onClick={onGoToCart}
            className={`py-2 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] text-[11px] font-bold rounded-full transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm ${!onAddMore ? 'col-span-2' : ''
              }`}
          >
            <Send className="w-3.5 h-3.5" />
            Submit Order Request
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Manual Inventory & Best Sellers Component ─────────────────────────────

interface InventoryViewProps {
  onAddToOrder: (product: WholesaleProduct, qty: number) => void;
  onGoToCart: () => void;
  cartItemCount: number;
}

const INVENTORY_CATEGORIES = [
  { id: 'All', label: '🔥 All Best Sellers' },
  { id: 'Disposable Vapes', label: '💨 Disposables' },
  { id: 'Vape Mods & Kits', label: '⚙️ Mods & Kits' },
  { id: 'Vape Juice', label: '💧 Vape Juice' },
  { id: 'Pipes & Glass', label: '🧪 Pipes & Glass' },
  { id: 'THCA, CBD & Delta', label: '🌿 THCA & Delta' },
  { id: 'Kratom', label: '🍃 Kratom' },
  { id: 'Novelties', label: '⚖️ Novelties' },
  { id: 'Accessories', label: '👑 Accessories' },
];

const MOD_SUBCATEGORIES = ['All Hardware', 'Devices Kit', 'Pod', 'Battery', 'Coils'];

const InventoryView: React.FC<InventoryViewProps> = ({ onAddToOrder, onGoToCart, cartItemCount }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All Hardware');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = PRODUCTS.filter((p) => {
    // Category match
    let matchesCategory = selectedCategory === 'All' ? p.popular : p.category === selectedCategory;

    // Subcategory match if inside Vape Mods & Kits
    if (selectedCategory === 'Vape Mods & Kits' && selectedSubcategory !== 'All Hardware') {
      matchesCategory = matchesCategory && p.subcategory === selectedSubcategory;
    }

    // Search query match
    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;
    const haystack = [
      p.name,
      p.brand,
      p.sku,
      p.category,
      p.subcategory || '',
      p.size || '',
      ...p.flavours,
      ...p.features,
    ].join(' ').toLowerCase();

    return matchesCategory && haystack.includes(q);
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f5f5f4]">
      {/* Category Pills & Search */}
      <div className="p-3 bg-white border-b border-neutral-100 space-y-2.5 shrink-0 shadow-2xs">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Geekbar, Raz, XROS, Juice Head, Glass, OPMS..."
            className="w-full bg-neutral-50 border border-neutral-200 rounded-full pl-8 pr-3 py-1.5 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#85AB8B] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-xs text-neutral-400 hover:text-neutral-600 absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              ✕
            </button>
          )}
        </div>

        {/* Primary Category Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mango-messages-scroll no-scrollbar">
          {INVENTORY_CATEGORIES.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            const count =
              cat.id === 'All'
                ? PRODUCTS.filter((p) => p.popular).length
                : PRODUCTS.filter((p) => p.category === cat.id).length;

            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedSubcategory('All Hardware');
                }}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold shrink-0 transition-all flex items-center gap-1 cursor-pointer select-none shadow-2xs ${isSelected
                  ? 'bg-[#1f2a1d] text-white scale-[1.02]'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 hover:text-[#1f2a1d]'
                  }`}
              >
                <span>{cat.label}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-[#85AB8B] text-[#1f2a1d]' : 'bg-neutral-200 text-neutral-500'
                    }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Secondary Subcategories for Vape Mods & Hardware */}
        {selectedCategory === 'Vape Mods & Kits' && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto pb-0.5 border-t border-neutral-100">
            <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 mr-1 shrink-0">
              Hardware:
            </span>
            {MOD_SUBCATEGORIES.map((sub) => {
              const isSubSelected = selectedSubcategory === sub;
              return (
                <button
                  key={sub}
                  onClick={() => setSelectedSubcategory(sub)}
                  className={`px-2.5 py-0.5 rounded-md text-[10px] font-semibold shrink-0 transition-colors cursor-pointer ${isSubSelected
                    ? 'bg-[#85AB8B] text-[#1f2a1d] font-bold'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Header Label */}
      <div className="px-3 py-2 bg-neutral-100/70 border-b border-neutral-200/60 flex items-center justify-between text-[11px] text-neutral-500">
        <span className="font-semibold text-[#1f2a1d]">
          {selectedCategory === 'All' ? '🔥 Top Wholesale Best Sellers' : selectedCategory}
          {selectedCategory === 'Vape Mods & Kits' && selectedSubcategory !== 'All Hardware' && ` › ${selectedSubcategory}`}
        </span>
        <span>{filteredProducts.length} items</span>
      </div>

      {/* Product List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 mango-messages-scroll">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 text-xs space-y-2">
            <div>No products found matching your search.</div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="text-[#336443] font-bold underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredProducts.map((p) => (
            <ProductCard key={p.id} product={p} onAddToOrder={onAddToOrder} />
          ))
        )}
      </div>

      {/* Sticky Bottom Cart Bar */}
      {cartItemCount > 0 && (
        <div className="p-3 bg-white border-t border-neutral-100 flex items-center justify-between gap-2 shrink-0 shadow-lg">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#1f2a1d]">
            <ShoppingBag className="w-4 h-4 text-[#336443]" />
            <span>{cartItemCount} item{cartItemCount !== 1 ? 's' : ''} in Cart</span>
          </div>
          <button
            onClick={onGoToCart}
            className="py-1.5 px-4 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] text-xs font-bold rounded-full transition-colors flex items-center gap-1 shadow cursor-pointer"
          >
            <span>Review Order</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Quick Actions ─────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: '📍', label: 'Store Location', prompt: 'Where are you located?' },
  { icon: '⏰', label: 'Store Hours', prompt: 'What are your store hours?' },
  { icon: '📦', label: 'Wholesale Info', prompt: 'How does wholesale work and what are your prices?' },
  { icon: '🚚', label: 'Pickup & Delivery', prompt: 'Do you offer same-day OKC pickup or metro delivery?' },
  { icon: '📞', label: 'Contact Store', prompt: 'What is your phone number and contact info?' },
];

// ─── Message Bubble ────────────────────────────────────────────────────────

interface MessageBubbleProps {
  message: ChatMessage;
  toolResults: MangoToolResult[];
  onAddToOrder: (product: WholesaleProduct, qty: number) => void;
  onGoToCart: () => void;
  onClearOrder: () => void;
  onAddMore: () => void;
  draftItems: DraftOrderItem[];
  draftTotal: number;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  toolResults,
  onAddToOrder,
  onGoToCart,
  onClearOrder,
  onAddMore,
  draftItems,
  draftTotal,
}) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-end gap-2 mango-msg ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <img
          src="/mango-avatar.jpg"
          alt="Mango"
          className="w-7 h-7 rounded-full object-cover shrink-0 border-2 border-white shadow-sm"
        />
      )}

      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        {message.text && (
          <div
            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${isUser
              ? 'bg-[#1f2a1d] text-white rounded-br-sm'
              : 'bg-white text-[#1f2a1d] rounded-bl-sm border border-neutral-100'
              }`}
            dangerouslySetInnerHTML={{
              __html: message.text
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br/>'),
            }}
          />
        )}

        {/* Render tool results inline (Order summaries only) */}
        {toolResults.map((result, i) => {
          if (result.type === 'order_updated' || result.type === 'order_summary') {
            return (
              <OrderSummary
                key={i}
                items={result.orderItems ?? draftItems}
                total={result.orderTotal ?? draftTotal}
                onGoToCart={onGoToCart}
                onClear={onClearOrder}
                onAddMore={onAddMore}
              />
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

// ─── Main MangoChat Component ──────────────────────────────────────────────

export default function MangoChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [isAnimatingOut, setIsAnimatingOut] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'inventory'>('chat');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! Woof woof! 🐕 This is Mango AI, your virtual assistant of Wholesale of Oklahoma. How can I help you today?',
      timestamp: Date.now(),
    },
  ]);
  const [messageToolResults, setMessageToolResults] = useState<Map<number, MangoToolResult[]>>(
    new Map()
  );
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [draftItems, setDraftItems] = useState<DraftOrderItem[]>([]);
  const [draftTotal, setDraftTotal] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const syncDraftOrder = useCallback(() => {
    setDraftItems([...getDraftOrder()]);
    setDraftTotal(getDraftOrderTotal());
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chat') {
      scrollToBottom();
    }
  }, [messages, isTyping, activeTab]);

  useEffect(() => {
    syncDraftOrder();
    const handleCartUpdated = () => syncDraftOrder();
    window.addEventListener('mango-cart-updated', handleCartUpdated);
    return () => {
      window.removeEventListener('mango-cart-updated', handleCartUpdated);
    };
  }, [syncDraftOrder]);

  const handleOpen = () => {
    setIsOpen(true);
    setIsAnimatingOut(false);
    setActiveTab('chat');
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleClose = () => {
    setIsAnimatingOut(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsAnimatingOut(false);
    }, 200);
  };

  const handleClearOrder = useCallback(() => {
    clearDraftOrder();
    syncDraftOrder();
  }, [syncDraftOrder]);

  const handleRemoveItem = useCallback(
    (productId: string) => {
      removeFromOrderDirect(productId);
      syncDraftOrder();
    },
    [syncDraftOrder]
  );

  const handleAddToOrder = useCallback(
    (product: WholesaleProduct, qty: number) => {
      // 1. Directly add to draft cart
      addToOrderDirect(product.id, qty);
      syncDraftOrder();

      // 2. Fetch fresh cart state
      const currentCart = getDraftOrder();
      const totalUnits = currentCart.reduce((sum, item) => sum + item.quantity, 0);

      // 3. Format current items in cart
      const cartList = currentCart
        .map((i) => `• **${i.quantity}x** ${i.product.name}`)
        .join('\n');

      // 4. Construct clear, helpful notification
      const botMsg: ChatMessage = {
        role: 'model',
        text: `✅ Added **${qty}x ${product.name}** to your cart! 🐕\n\n📦 **Current Cart (${totalUnits} units total):**\n${cartList}\n\nCall **(405) 768-2975** for immediate wholesale pricing. You can add more items or click **Submit Order Request** below to finish!`,
        toolResults: [
          {
            type: 'order_summary',
            orderItems: [...currentCart],
            orderTotal: totalUnits,
          },
        ],
        timestamp: Date.now(),
      };

      setMessages((prev) => {
        const next = [...prev, botMsg];
        setMessageToolResults((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(next.length - 1, botMsg.toolResults || []);
          return newMap;
        });
        return next;
      });
    },
    [syncDraftOrder]
  );

  const handleAddMore = useCallback(() => {
    setActiveTab('inventory');
  }, []);

  const handleGoToCart = useCallback(() => {
    window.dispatchEvent(new CustomEvent('open-cart'));
  }, []);

  const handleOrderSubmitted = useCallback(
    (customerName: string, customerPhone: string) => {
      clearDraftOrder();
      syncDraftOrder();

      // Post celebration in chat
      const confirmationMsg: ChatMessage = {
        role: 'model',
        text: `🎉 **Order Request Submitted!** Woof! Thank you, **${customerName}**! Our dispatch team has received your order request and will reach out to **${customerPhone}** shortly to confirm pricing and pickup/delivery. 🐕`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, confirmationMsg]);
    },
    [syncDraftOrder]
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isTyping) return;

      setActiveTab('chat');
      setShowQuickActions(false);
      const userMsg: ChatMessage = { role: 'user', text: text.trim(), timestamp: Date.now() };
      const userIdx = messages.length;

      setMessages((prev) => {
        const next = [...prev, userMsg];
        setMessageToolResults((prevMap) => {
          const newMap = new Map(prevMap);
          newMap.set(userIdx, []);
          return newMap;
        });
        return next;
      });
      setInputValue('');
      setIsTyping(true);

      try {
        const result = await sendMangoMessage(text.trim(), messages);
        syncDraftOrder();

        const botMsg: ChatMessage = { role: 'model', text: result.text, toolResults: result.toolResults, timestamp: Date.now() };
        setMessages((prev) => {
          const next = [...prev, botMsg];
          const botIdx = next.length - 1;
          setMessageToolResults((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(botIdx, result.toolResults);
            return newMap;
          });
          return next;
        });
      } catch {
        const errorMsg: ChatMessage = {
          role: 'model',
          text: "Oops, I ran into a snag! Please call us directly at **(405) 768-2975**. 🐕",
          timestamp: Date.now(),
        };
        setMessages((prev) => {
          const next = [...prev, errorMsg];
          setMessageToolResults((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(next.length - 1, []);
            return newMap;
          });
          return next;
        });
      } finally {
        setIsTyping(false);
      }
    },
    [isTyping, messages, syncDraftOrder]
  );

  const handleQuickAction = useCallback(
    (prompt: string) => {
      sendMessage(prompt);
    },
    [sendMessage]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      sendMessage(inputValue);
    },
    [inputValue, sendMessage]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  const orderItemCount = draftItems.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      {/* ── Floating Trigger Button ── */}
      <div
        className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2"
        style={{ pointerEvents: 'none' }}
      >
        <button
          id="mango-chat-trigger"
          onClick={isOpen ? handleClose : handleOpen}
          aria-label={isOpen ? 'Close Mango chat' : 'Open Mango chat'}
          aria-expanded={isOpen}
          style={{ pointerEvents: 'auto' }}
          className={`mango-avatar-btn group relative flex items-center gap-2.5 bg-[#1f2a1d] hover:bg-[#2a3a27] text-white pl-1.5 pr-4 py-1.5 rounded-full shadow-xl border border-white/10 transition-all duration-300 cursor-pointer select-none ${
            !isOpen ? 'mango-pulse' : ''
          }`}
        >
          <div className="relative">
            <img
              src="/mango-avatar.jpg"
              alt="Mango Mascot"
              className="w-9 h-9 rounded-full object-cover border-2 border-[#85AB8B] shadow-sm group-hover:scale-105 transition-transform"
            />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1f2a1d] rounded-full" />
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>Mango</span>
              <span className="text-[10px]">🐕</span>
            </div>
            <div className="text-[10px] text-[#85AB8B] font-medium">Wholesale Assistant</div>
          </div>

          {isOpen && <X className="w-3.5 h-3.5 ml-0.5 text-neutral-400 group-hover:text-white transition-colors" />}
        </button>
      </div>

      {/* ── Chat & Inventory Window ── */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Mango Virtual Assistant"
          aria-modal="true"
          className={`fixed z-50
            /* Mobile: full-width bottom sheet */
            bottom-0 left-0 right-0 h-[92dvh]
            /* Desktop: positioned above button */
            sm:bottom-24 sm:right-6 sm:left-auto sm:w-[420px] sm:h-[640px] sm:max-h-[90dvh]
            flex flex-col bg-[#f5f5f4] overflow-hidden
            /* Rounded corners */
            rounded-t-3xl sm:rounded-3xl
            shadow-2xl border border-white/20
            ${isAnimatingOut ? 'mango-chat-exit' : 'mango-chat-enter'}`}
        >
          {/* ── Chat Header ── */}
          <div className="bg-[#1f2a1d] px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="relative">
              <img
                src="/mango-avatar.jpg"
                alt="Mango"
                className="w-10 h-10 rounded-full object-cover border-2 border-[#85AB8B]/40 shadow"
              />
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#1f2a1d] rounded-full" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm flex items-center gap-1.5">
                <span>Mango</span>
                <span className="text-xs">🐕</span>
              </div>
              <div className="text-[#85AB8B] text-[10px] font-medium">Wholesale of Oklahoma Assistant</div>
            </div>

            <a
              href="tel:4057682975"
              title="Call Store Directly"
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={handleClose}
              className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors cursor-pointer"
              aria-label="Close Mango"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── View Navigation Tabs ── */}
          <div className="bg-[#1f2a1d] px-3 pb-2 flex items-center gap-1 border-b border-white/10 shrink-0">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'chat'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#85AB8B]" />
              <span>Chat</span>
            </button>

            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white/15 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Package className="w-3.5 h-3.5 text-[#85AB8B]" />
              <span>Inventory</span>
            </button>

            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('open-cart'));
              }}
              className="flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer text-neutral-300 hover:text-white hover:bg-white/10"
              title="Open Wholesale Shopping Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#85AB8B]" />
              <span>View Cart</span>
              {orderItemCount > 0 && (
                <span className="bg-[#85AB8B] text-[#1f2a1d] text-[9px] font-black px-1.5 py-0.2 rounded-full ml-0.5">
                  {orderItemCount}
                </span>
              )}
            </button>
          </div>

          {/* ── TAB CONTENT: CHAT ── */}
          {activeTab === 'chat' && (
            <div className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 mango-messages-scroll">
                {messages.map((msg, idx) => (
                  <MessageBubble
                    key={idx}
                    message={msg}
                    toolResults={messageToolResults.get(idx) ?? []}
                    onAddToOrder={handleAddToOrder}
                    onGoToCart={handleGoToCart}
                    onClearOrder={handleClearOrder}
                    onAddMore={handleAddMore}
                    draftItems={draftItems}
                    draftTotal={draftTotal}
                  />
                ))}

                {/* Typing indicator */}
                {isTyping && <TypingIndicator />}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick Actions */}
              {showQuickActions && (
                <div className="px-4 pb-2 flex flex-wrap gap-1.5 shrink-0">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className="mango-chip flex items-center gap-1 text-[11px] font-semibold text-[#1f2a1d] bg-white border border-neutral-200 px-3 py-1.5 rounded-full shadow-sm cursor-pointer"
                    >
                      <span>{action.icon}</span>
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* Chat Input Bar */}
              <div className="p-3 bg-white border-t border-neutral-200 shrink-0">
                <form onSubmit={handleSubmit} className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Mango or search products..."
                    className="flex-1 bg-neutral-50 border border-neutral-200 rounded-full px-4 py-2.5 text-xs text-[#1f2a1d] placeholder-neutral-400 focus:outline-none focus:border-[#85AB8B] transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="w-8 h-8 rounded-full bg-[#1f2a1d] hover:bg-[#336443] disabled:opacity-30 text-white flex items-center justify-center transition-colors shrink-0 cursor-pointer shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="text-[9px] text-neutral-400 text-center mt-1">
                  Mango wholesale assistant · Call (405) 768-2975 for direct pricing
                </div>
              </div>
            </div>
          )}

          {/* ── TAB CONTENT: INVENTORY BROWSE ── */}
          {activeTab === 'inventory' && (
            <InventoryView
              onAddToOrder={handleAddToOrder}
              onGoToCart={handleGoToCart}
              cartItemCount={orderItemCount}
            />
          )}
        </div>
      )}
    </>
  );
}
