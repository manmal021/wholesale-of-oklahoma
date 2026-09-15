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
    window.addEventListener('storage', handleCartUpdate);
    return () => {
      window.removeEventListener('mango-cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
    };
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
        fulfillmentMethod: 'PICKUP',
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
    <section id="direct-order-section" className="py-16 md:py-24 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-10 relative overflow-hidden border-t border-slate-200">
      {/* Editorial aesthetic organic gradient circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#FF6B00] opacity-10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-slate-300 opacity-20 blur-[120px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header Block */}
        <div className="text-center space-y-4 mb-12">
          <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#FF6B00] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider border border-orange-200">
            <Sparkles className="w-3.5 h-3.5 text-[#FF6B00]" />
            Direct Restock Request
          </span>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-slate-900 leading-tight">
            Order Now
          </h2>
          <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Fill out your shop and batch details below. Our central OKC dispatch staff will instantly contact you to confirm pricing, delivery channels, or S Bryant Ave pickup stack.
          </p>
        </div>

        {/* Order Submitted Success Card */}
        {orderSubmitted ? (
          <div className="bg-white rounded-[32px] p-8 sm:p-12 border border-slate-200 text-center space-y-5 shadow-2xl animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-[#FF6B00] text-white flex items-center justify-center mx-auto shadow-lg">
              <Check className="w-8 h-8" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Restock Request Received!
            </h3>
            <p className="text-slate-600 text-sm max-w-md mx-auto leading-relaxed">
              Your order ref <strong className="text-slate-900 font-mono">{orderSubmitted}</strong> has been logged into our warehouse dispatch system. Our live dispatcher is reviewing your batch.
            </p>
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="tel:4057682975"
                className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs uppercase tracking-widest px-8 py-3.5 rounded-full transition-colors flex items-center gap-2 shadow-lg"
              >
                <Phone className="w-4 h-4 text-white" />
                Call Live Desk: (405) 768-2975
              </a>
              <button
                type="button"
                onClick={() => setOrderSubmitted(null)}
                className="text-xs text-slate-500 hover:text-slate-900 transition-colors underline cursor-pointer"
              >
                Place Another Request
              </button>
            </div>
          </div>
        ) : (
          /* Beautiful Modern Grid Form */
          <div className="bg-white rounded-[32px] p-6 sm:p-10 border border-slate-200 shadow-xl space-y-8">
            {/* Real-Time Cart Review Banner if items added from Inventory */}
            {cartItems.length > 0 && (
              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-1.5">
                    <ShoppingBag className="w-4 h-4" />
                    Selected Inventory Cart ({cartItems.reduce((s, i) => s + i.quantity, 0)} units)
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
                      className="text-[11px] font-bold text-[#FF6B00] hover:text-[#E85F00] flex items-center gap-1 transition-colors cursor-pointer underline"
                    >
                      Edit Cart in Drawer →
                    </button>
                    <button
                      type="button"
                      onClick={() => clearDraftOrder()}
                      className="text-[11px] text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-200 text-xs">
                  {cartItems.map((ci, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between">
                      <div>
                        <span className="font-bold text-slate-900 block">{ci.product.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">SKU: {ci.product.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-[#FF6B00]">{ci.quantity} units</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-orange-50/50 border border-orange-200 rounded-2xl">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-[#FF6B00]" />
                <div className="text-xs">
                  <span className="font-bold text-slate-900 block">Licensed B2B Wholesale Distributor</span>
                  <span className="text-slate-600">Tax-exempt resale pricing available for verified retail shops.</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-wholesale-application'))}
                className="text-xs font-bold text-[#FF6B00] hover:text-[#E85F00] underline cursor-pointer shrink-0"
              >
                Apply for Wholesale Account →
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Name */}
                <div className="space-y-2">
                  <label htmlFor="order-name" className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="order-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Business Name */}
                <div className="space-y-2">
                  <label htmlFor="order-business-name" className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Business Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="order-business-name"
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Oklahoma City Vape Hub"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Phone number */}
                <div className="space-y-2">
                  <label htmlFor="order-phone" className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="order-phone"
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. (405) 555-0199"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors text-slate-900 placeholder-slate-400"
                  />
                </div>

                {/* Email address */}
                <div className="space-y-2">
                  <label htmlFor="order-email" className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="order-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@store.com"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors text-slate-900 placeholder-slate-400"
                  />
                </div>

              </div>

              {/* Details of orders */}
              <div className="space-y-2">
                <label htmlFor="order-details" className="text-xs font-extrabold uppercase tracking-widest text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Details of Orders <span className="text-red-500">*</span>
                </label>
                <textarea
                  id="order-details"
                  required
                  rows={4}
                  value={orderDetails}
                  onChange={(e) => setOrderDetails(e.target.value)}
                  placeholder="e.g. 50x Geekbar Pulse 15k (Sour Apple, Watermelon Ice)..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors text-slate-900 resize-none placeholder-slate-400"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-4 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer select-none disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSubmitting ? 'Submitting to Dispatch...' : 'Submit Order Request'}
                </button>

                {/* Live dial backup button */}
                <a
                  href="tel:4057682975"
                  className="sm:px-8 py-4 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <Phone className="w-4 h-4 text-[#FF6B00]" />
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
