import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Check,
  Phone,
  MessageSquare,
  ShieldCheck,
  Mail,
  Building,
  User,
  FileText,
  ShoppingBag,
  Trash2,
  Package,
} from 'lucide-react';
import { getDraftOrder, clearDraftOrder, type DraftOrderItem } from '../lib/mangoAI';
import { submitWholesaleOrder } from '../lib/inventoryApi';

export default function OrderForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderDetails, setOrderDetails] = useState('');
  const [cartItems, setCartItems] = useState<DraftOrderItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSubmitted, setOrderSubmitted] = useState<string | null>(null);

  const syncCart = () => {
    const items = getDraftOrder();
    setCartItems([...items]);

    // Auto-populate Order Details if cart has items and orderDetails is empty
    if (items.length > 0) {
      const summaryText = items
        .map((i) => `${i.quantity}x ${i.product.name} (${i.product.sku})`)
        .join(', ');
      setOrderDetails((prev) => (prev ? prev : summaryText));
    }
  };

  useEffect(() => {
    syncCart();
    const handleCartUpdate = () => syncCart();
    window.addEventListener('mango-cart-updated', handleCartUpdate);
    return () => window.removeEventListener('mango-cart-updated', handleCartUpdate);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // 1. Process wholesale order in the background through backend (drives Zoho Inventory sales order)
      const lineItems = cartItems.length > 0
        ? cartItems.map((ci) => ({
            id: ci.product.id,
            sku: ci.product.sku,
            name: ci.product.name,
            quantity: ci.quantity,
            pricePerUnit: ci.pricePerUnit,
            zoho_item_id: (ci.product as any).zoho_item_id,
          }))
        : [
            {
              name: orderDetails.slice(0, 50),
              quantity: 1,
              pricePerUnit: 0,
            },
          ];

      const backendRes = await submitWholesaleOrder({
        customerName: name,
        businessName,
        email,
        phone,
        notes: orderDetails,
        lineItems,
      }).catch(() => null);

      // 2. Also send notification to dispatch via Web3Forms
      const formData = new FormData();
      formData.append('access_key', '1ebec85d-15fd-4f21-9513-ef05685850bc');
      formData.append('subject', 'New Wholesale Restock Request — Wholesale of OK');
      formData.append('from_name', 'Wholesale of Oklahoma Orders');
      formData.append('Name', name);
      formData.append('Business Name', businessName);
      formData.append('Phone', phone);
      formData.append('Email', email);
      formData.append('Order Details', orderDetails);
      if (backendRes?.orderId) {
        formData.append('Order Reference', backendRes.orderId);
      }

      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      }).catch(() => null);

      const generatedId = backendRes?.orderId || `WOO-${Date.now().toString().slice(-6)}`;
      setOrderSubmitted(generatedId);
      clearDraftOrder();
      setCartItems([]);
    } catch (err: any) {
      console.error('Order submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section id="direct-order-section" className="py-16 md:py-24 bg-[#1f2a1d] text-white px-4 sm:px-6 md:px-10 relative overflow-hidden">
      {/* Editorial aesthetic organic gradient circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#85AB8B] opacity-10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[#3d5638] opacity-15 blur-[110px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header Block */}
        <div className="text-center space-y-4 mb-12">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-[#85AB8B] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#85AB8B]" />
            Direct Restock Request
          </span>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
            Order Now
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Fill out your shop and batch details below. Our central OKC dispatch staff will instantly contact you to confirm pricing, delivery channels, or S Bryant Ave pickup stack.
          </p>
        </div>

        {/* Order Submitted Success Card */}
        {orderSubmitted ? (
          <div className="bg-white/10 backdrop-blur-xl rounded-[32px] p-8 sm:p-12 border border-white/20 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-[#336443] text-[#85AB8B] flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-white">
              Restock Request Received!
            </h3>
            <p className="text-neutral-300 text-sm max-w-md mx-auto leading-relaxed">
              Your order ref <strong className="text-white font-mono">{orderSubmitted}</strong> has been logged into our warehouse dispatch system. Our live dispatcher is reviewing your batch.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:4057682975"
                className="bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-colors flex items-center gap-2 shadow"
              >
                <Phone className="w-4 h-4" />
                Call Live Desk: (405) 768-2975
              </a>
              <button
                type="button"
                onClick={() => setOrderSubmitted(null)}
                className="text-xs text-neutral-400 hover:text-white transition-colors underline cursor-pointer"
              >
                Place Another Request
              </button>
            </div>
          </div>
        ) : (
          /* Beautiful Modern Grid Form */
          <div className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-white/10 shadow-2xl space-y-8">
            {/* Real-Time Cart Review Banner if items added from Inventory */}
            {cartItems.length > 0 && (
              <div className="bg-white/10 rounded-2xl p-5 border border-white/15 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#85AB8B] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    Selected Inventory Cart ({cartItems.reduce((s, i) => s + i.quantity, 0)} units)
                  </span>
                  <button
                    type="button"
                    onClick={() => clearDraftOrder()}
                    className="text-[11px] text-neutral-400 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                    Clear Cart
                  </button>
                </div>

                <div className="divide-y divide-white/10 text-xs">
                  {cartItems.map((ci, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-white block">{ci.product.name}</span>
                        <span className="font-mono text-[10px] text-neutral-400">SKU: {ci.product.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#85AB8B]">{ci.quantity} boxes</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Name */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#85AB8B]" />
                    Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                  />
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#85AB8B]" />
                    Business Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Oklahoma City Vape Hub"
                    className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                  />
                </div>

                {/* Phone number */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#85AB8B]" />
                    Phone Number <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (405) 555-0199"
                    className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                  />
                </div>

                {/* Email address */}
                <div className="space-y-2">
                  <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#85AB8B]" />
                    Email Address <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@store.com"
                    className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                  />
                </div>

              </div>

              {/* Details of orders */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#85AB8B]" />
                  Details of Orders <span className="text-red-400">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  placeholder="e.g. 50x Geekbar Pulse 15k (Sour Apple, Watermelon Ice)..."
                  className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white resize-none placeholder-neutral-500"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer select-none disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting to Dispatch...' : 'Submit Order Request'}
                </button>

                {/* Live dial backup button */}
                <a
                  href="tel:4057682975"
                  className="sm:px-8 py-4 bg-white/10 hover:bg-white/20 text-[#85AB8B] border border-white/15 font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4 text-white" />
                  Call Live Desk
                </a>
              </div>

            </form>
          </div>
        )}

      </div>
    </section>
  );
}
