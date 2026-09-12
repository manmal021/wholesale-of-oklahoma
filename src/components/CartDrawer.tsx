import React, { useState, useEffect } from 'react';
import {
  ShoppingBag,
  X,
  Trash2,
  Plus,
  Minus,
  Send,
  CheckCircle2,
  Phone,
  AlertCircle,
  User,
  Mail,
  Building,
  FileText,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Package,
} from 'lucide-react';
import {
  getDraftOrder,
  getDraftOrderTotal,
  clearDraftOrder,
  removeFromOrderDirect,
  updateOrderItemQuantity,
  type DraftOrderItem,
} from '../lib/mangoAI';
import { submitWholesaleOrder } from '../lib/inventoryApi';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CartDrawer({ isOpen, onClose }: CartDrawerProps) {
  const [items, setItems] = useState<DraftOrderItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedOrderId, setSubmittedOrderId] = useState<string | null>(null);

  const syncCart = () => {
    setItems([...getDraftOrder()]);
  };

  // Synchronize cart whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      syncCart();
    }
  }, [isOpen]);

  useEffect(() => {
    syncCart();
    const handleUpdate = () => syncCart();
    window.addEventListener('mango-cart-updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener('mango-cart-updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Lock background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const totalUnits = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = getDraftOrderTotal();

  const handleQtyChange = (productId: string, currentQty: number, delta: number, flavor?: string) => {
    const newQty = currentQty + delta;
    updateOrderItemQuantity(productId, newQty, flavor);
  };

  const handleRemove = (productId: string, flavor?: string) => {
    removeFromOrderDirect(productId, flavor);
  };

  const handleClear = () => {
    clearDraftOrder();
  };

  const handleBrowseInventory = () => {
    onClose();
    const el = document.getElementById('inventory');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    setStatus('submitting');
    setErrorMessage('');

    const orderDetailsSummary = items
      .map(
        (i, idx) =>
          `${idx + 1}. ${i.product.name} (SKU: ${i.product.sku}) — ${i.quantity} units ${
            i.flavor ? `[Flavor: ${i.flavor}]` : ''
          }${i.pricePerUnit > 0 ? ` @ $${i.pricePerUnit.toFixed(2)}/ea` : ' (Tier Pricing)'}`
      )
      .join('\n');

    try {
      // 1. Send to backend Zoho / sales order pipeline
      const lineItems = items.map((ci) => ({
        id: ci.product.id,
        sku: ci.product.sku,
        name: ci.product.name,
        quantity: ci.quantity,
        pricePerUnit: ci.pricePerUnit,
        zoho_item_id: (ci.product as any).zoho_item_id,
      }));

      const backendRes = await submitWholesaleOrder({
        customerName: name,
        businessName,
        email,
        phone,
        notes: `${notes ? `Customer Notes: ${notes}\n\n` : ''}Items:\n${orderDetailsSummary}`,
        lineItems,
      }).catch(() => null);

      // 2. Send dispatch email notification via Web3Forms
      const formData = new FormData();
      formData.append('access_key', '1ebec85d-15fd-4f21-9513-ef05685850bc');
      formData.append(
        'subject',
        `New Wholesale Cart Order: ${name} (${totalUnits} units)`
      );
      formData.append('from_name', 'Wholesale of Oklahoma Cart');
      formData.append('Name', name);
      formData.append('Phone', phone);
      formData.append('Email', email);
      formData.append('Business Name', businessName || 'Not Provided');
      formData.append('Total Units', `${totalUnits} units`);
      formData.append('Order Details', orderDetailsSummary);
      formData.append('Customer Notes', notes || 'None');
      if (backendRes?.orderId) {
        formData.append('Order Reference', backendRes.orderId);
      }

      await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      }).catch(() => null);

      const genId = backendRes?.orderId || `WOO-${Date.now().toString().slice(-6)}`;
      setSubmittedOrderId(genId);
      setStatus('success');
      clearDraftOrder();
    } catch (err: any) {
      console.error('Cart order submission error:', err);
      setStatus('error');
      setErrorMessage(
        'There was an error submitting your order. Please call our warehouse directly at (405) 768-2975.'
      );
    }
  };

  const handleResetForm = () => {
    setStatus('idle');
    setSubmittedOrderId(null);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Wholesale Shopping Cart"
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] max-w-full bg-[#fbfbf9] text-[#1f2a1d] shadow-2xl flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-[#1f2a1d] text-white px-5 py-4 flex items-center justify-between shadow-md shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#85AB8B]/20 flex items-center justify-center text-[#85AB8B] border border-[#85AB8B]/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-white">Wholesale Cart</h2>
                {totalUnits > 0 && (
                  <span className="bg-[#85AB8B] text-[#1f2a1d] text-[10px] font-black px-2 py-0.5 rounded-full">
                    {totalUnits} units
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#85AB8B] font-medium">
                Wholesale of Oklahoma · Licensed Distributor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
            aria-label="Close Shopping Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        {status === 'success' ? (
          // Success Screen
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#1f2a1d]">Order Request Submitted!</h3>
              <p className="text-xs text-neutral-500 mt-1">
                Reference ID: <span className="font-mono font-bold text-[#1f2a1d]">{submittedOrderId}</span>
              </p>
            </div>

            <p className="text-xs text-neutral-600 leading-relaxed max-w-sm">
              Thank you, <strong>{name}</strong>! Your wholesale restock request has been sent to our dispatch team. We will call you at <strong>{phone}</strong> to confirm wholesale pricing, arrange OKC warehouse pickup, or schedule metro delivery.
            </p>

            <div className="w-full bg-neutral-100 rounded-2xl p-4 text-left text-xs space-y-2 border border-neutral-200/80">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-500">Contact Phone</span>
                <span className="font-bold text-[#1f2a1d]">{phone}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-neutral-500">Confirmation Email</span>
                <span className="font-bold text-[#1f2a1d] truncate max-w-[200px]">{email}</span>
              </div>
              {businessName && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-neutral-500">Business Name</span>
                  <span className="font-bold text-[#1f2a1d]">{businessName}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <a
                href="tel:4057682975"
                className="py-3 bg-[#1f2a1d] hover:bg-[#336443] text-white text-xs font-bold rounded-full flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Phone className="w-4 h-4 text-[#85AB8B]" />
                Call Warehouse Live (405) 768-2975
              </a>
              <button
                onClick={handleResetForm}
                className="py-2.5 bg-white border border-neutral-300 text-[#1f2a1d] text-xs font-bold rounded-full hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                Continue Browsing Catalog
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          // Empty Cart Screen
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#1f2a1d]">Your Wholesale Cart is Empty</h3>
              <p className="text-xs text-neutral-500 max-w-xs mt-1 leading-relaxed">
                Add disposable vapes, pod kits, coils, juice, glass, or kratom from our live wholesale catalog to build your order request.
              </p>
            </div>

            <button
              onClick={handleBrowseInventory}
              className="py-3 px-6 bg-[#1f2a1d] hover:bg-[#336443] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-105 active:scale-95"
            >
              <Package className="w-4 h-4 text-[#85AB8B]" />
              <span>Browse Live Inventory</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <div className="pt-8 border-t border-neutral-200/60 w-full text-center">
              <p className="text-[11px] text-neutral-400 font-medium">Need immediate phone restock?</p>
              <a
                href="tel:4057682975"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#336443] hover:underline mt-1"
              >
                <Phone className="w-3.5 h-3.5" />
                (405) 768-2975 · Live Dispatch
              </a>
            </div>
          </div>
        ) : (
          // Active Cart Content
          <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-neutral-200/70">
            {/* Items Section */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Order Items ({items.length} product{items.length !== 1 ? 's' : ''}, {totalUnits} total units)
                </span>
                <button
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-neutral-400 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const unitPriceStr =
                    item.pricePerUnit > 0
                      ? `$${item.pricePerUnit.toFixed(2)}/ea`
                      : 'Volume Tier Pricing';

                  return (
                    <div
                      key={`${item.product.id}-${item.flavor || idx}`}
                      className="bg-white rounded-2xl p-3.5 border border-neutral-200/80 shadow-sm flex items-center gap-3 transition-all hover:border-[#85AB8B]/50"
                    >
                      {/* Product Thumbnail or Fallback */}
                      <div className="w-12 h-12 rounded-xl bg-neutral-100 overflow-hidden shrink-0 flex items-center justify-center border border-neutral-200/60">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-neutral-400" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#1f2a1d] leading-snug truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-neutral-500 mt-0.5">
                          <span>SKU: {item.product.sku}</span>
                          {item.flavor && (
                            <span className="bg-neutral-100 text-neutral-700 px-1.5 py-0.2 rounded font-medium">
                              {item.flavor}
                            </span>
                          )}
                          <span className="font-semibold text-[#336443]">{unitPriceStr}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-neutral-100 rounded-lg p-1 shrink-0 border border-neutral-200/80">
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, -1, item.flavor)}
                          className="w-6 h-6 rounded bg-white hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer shadow-xs"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-[#1f2a1d]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, 1, item.flavor)}
                          className="w-6 h-6 rounded bg-white hover:bg-neutral-200 flex items-center justify-center text-neutral-700 transition-colors cursor-pointer shadow-xs"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemove(item.product.id, item.flavor)}
                        className="text-neutral-300 hover:text-rose-500 p-1 transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                        aria-label="Remove item from cart"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Add More Items Button */}
              <button
                onClick={handleBrowseInventory}
                className="w-full py-2 bg-neutral-100 hover:bg-neutral-200/70 text-[#1f2a1d] text-xs font-semibold rounded-xl border border-neutral-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#336443]" />
                <span>Add More Products from Catalog</span>
              </button>
            </div>

            {/* Wholesale Checkout / Order Request Form */}
            <div className="p-4 sm:p-5 bg-white space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#336443]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#1f2a1d]">
                    Dispatch & Contact Information
                  </h3>
                </div>
                <p className="text-[11px] text-neutral-500 mt-0.5">
                  Send this order request directly to our Oklahoma City warehouse team. We confirm wholesale tier rates by phone before final dispatch.
                </p>
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOrder} className="space-y-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-[#85AB8B]" />
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#336443] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-[#85AB8B]" />
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) 000-0000"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#336443] focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3 text-[#85AB8B]" />
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@store.com"
                      className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#336443] focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1 mb-1">
                    <Building className="w-3 h-3 text-[#85AB8B]" />
                    Business / Store Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. OKC Smoke & Vape LLC"
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#336443] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-600 flex items-center gap-1 mb-1">
                    <FileText className="w-3 h-3 text-[#85AB8B]" />
                    Delivery & Pickup Notes / Preferences
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Same-day OKC pickup, metro delivery, flavor requests, etc."
                    className="w-full bg-neutral-50 border border-neutral-200 rounded-xl px-3.5 py-2 text-xs text-[#1f2a1d] focus:outline-none focus:border-[#336443] focus:bg-white transition-all resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-3 bg-[#1f2a1d] hover:bg-[#336443] disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-3 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-[#85AB8B]" />
                      <span>Submitting Order Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-[#85AB8B]" />
                      <span>Submit Wholesale Order ({totalUnits} Units)</span>
                    </>
                  )}
                </button>

                <div className="text-[10px] text-neutral-400 text-center flex items-center justify-center gap-2">
                  <span>Direct phone quotes:</span>
                  <a href="tel:4057682975" className="font-bold text-[#1f2a1d] hover:underline">
                    (405) 768-2975
                  </a>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
