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
    setItems([]);
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
      setStatus('error');
      setErrorMessage(
        err.message || 'Unable to submit order draft. Please call (405) 768-2975.'
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
        className={`fixed inset-0 z-50 bg-[#0B0D10]/80 backdrop-blur-md transition-opacity duration-300 ${
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
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[480px] max-w-full bg-[#15191F] text-[#F7F7F5] shadow-2xl border-l border-[#2A3038] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-[#0B0D10] text-[#F7F7F5] px-5 py-4 flex items-center justify-between shadow-md shrink-0 border-b border-[#2A3038]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-[#F7F7F5]">Wholesale Cart</h2>
                {totalUnits > 0 && (
                  <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm">
                    {totalUnits} units
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#FF6B00] font-medium">
                Wholesale of Oklahoma · Licensed Distributor
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1B2027] hover:bg-[#2A3038] flex items-center justify-center text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
            aria-label="Close Shopping Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        {status === 'success' ? (
          // Success Screen
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner animate-bounce">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-[#F7F7F5]">Order Request Submitted!</h3>
              <p className="text-xs text-[#858C96] mt-1">
                Reference ID: <span className="font-mono font-bold text-[#FF6B00]">{submittedOrderId}</span>
              </p>
            </div>

            <p className="text-xs text-[#B8BDC5] leading-relaxed max-w-sm">
              Thank you, <strong>{name}</strong>. Your wholesale order draft has been received by our Oklahoma City dispatch desk. An account representative will contact you shortly to confirm wholesale case tier pricing and dockside logistics.
            </p>

            <div className="w-full bg-[#1B2027] rounded-2xl p-4 border border-[#2A3038] text-xs space-y-2 text-left">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#858C96]">Order Reference</span>
                <span className="font-mono font-bold text-[#F7F7F5]">{submittedOrderId}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-[#858C96]">Confirmation Email</span>
                <span className="font-bold text-[#F7F7F5] truncate max-w-[200px]">{email}</span>
              </div>
              {businessName && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#858C96]">Business Name</span>
                  <span className="font-bold text-[#F7F7F5]">{businessName}</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <a
                href="tel:4057682975"
                className="py-3 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Phone className="w-4 h-4 text-white" />
                Call Warehouse Live (405) 768-2975
              </a>
              <button
                onClick={handleResetForm}
                className="py-2.5 bg-[#1B2027] border border-[#2A3038] text-[#F7F7F5] text-xs font-bold rounded-full hover:bg-[#2A3038] transition-colors cursor-pointer"
              >
                Continue Browsing Catalog
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          // Empty Cart Screen
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-[#1B2027] border border-[#2A3038] flex items-center justify-center text-[#858C96]">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#F7F7F5]">Your Wholesale Cart is Empty</h3>
              <p className="text-xs text-[#858C96] max-w-xs mt-1 leading-relaxed">
                Add disposable vapes, pod kits, coils, juice, glass, or kratom from our live wholesale catalog to build your order request.
              </p>
            </div>

            <button
              onClick={handleBrowseInventory}
              className="py-3 px-6 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-md cursor-pointer hover:scale-105 active:scale-95"
            >
              <Package className="w-4 h-4 text-white" />
              <span>Browse Live Inventory</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/70" />
            </button>

            <div className="pt-8 border-t border-[#2A3038] w-full text-center">
              <p className="text-[11px] text-[#858C96] font-medium">Need immediate phone restock?</p>
              <a
                href="tel:4057682975"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#FF6B00] hover:underline mt-1"
              >
                <Phone className="w-3.5 h-3.5" />
                (405) 768-2975 · Live Dispatch
              </a>
            </div>
          </div>
        ) : (
          // Active Cart Content
          <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-[#2A3038]">
            {/* Items Section */}
            <div className="p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">
                  Order Items ({items.length} product{items.length !== 1 ? 's' : ''}, {totalUnits} total units)
                </span>
                <button
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-[#858C96] hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
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
                      className="bg-[#1B2027] rounded-2xl p-3.5 border border-[#2A3038] shadow-sm flex items-center gap-3 transition-all hover:border-[#FF6B00]/50"
                    >
                      {/* Product Thumbnail or Fallback */}
                      <div className="w-12 h-12 rounded-xl bg-[#0B0D10] overflow-hidden shrink-0 flex items-center justify-center border border-[#2A3038]">
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
                          <Package className="w-6 h-6 text-[#858C96]" />
                        )}
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-[#F7F7F5] leading-snug truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-[#858C96] mt-0.5">
                          <span>SKU: {item.product.sku}</span>
                          {item.flavor && (
                            <span className="bg-[#0B0D10] text-[#B8BDC5] px-1.5 py-0.2 rounded font-medium border border-[#2A3038]">
                              {item.flavor}
                            </span>
                          )}
                          <span className="font-semibold text-[#FF6B00]">{unitPriceStr}</span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5 bg-[#15191F] rounded-lg p-1 shrink-0 border border-[#2A3038]">
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, -1, item.flavor)}
                          className="w-6 h-6 rounded bg-[#1B2027] hover:bg-[#2A3038] flex items-center justify-center text-[#F7F7F5] transition-colors cursor-pointer border border-[#2A3038]"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-[#F7F7F5]">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, 1, item.flavor)}
                          className="w-6 h-6 rounded bg-[#1B2027] hover:bg-[#2A3038] flex items-center justify-center text-[#F7F7F5] transition-colors cursor-pointer border border-[#2A3038]"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemove(item.product.id, item.flavor)}
                        className="text-[#858C96] hover:text-rose-400 p-1 transition-colors cursor-pointer shrink-0"
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
                className="w-full py-2 bg-[#1B2027] hover:bg-[#2A3038] text-[#F7F7F5] text-xs font-semibold rounded-xl border border-[#2A3038] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Add More Products from Catalog</span>
              </button>
            </div>

            {/* Wholesale Checkout / Order Request Form */}
            <div className="p-4 sm:p-5 bg-[#15191F] space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5]">
                    Dispatch & Contact Information
                  </h3>
                </div>
                <p className="text-[11px] text-[#858C96] mt-0.5">
                  Send this order request directly to our Oklahoma City warehouse team. We confirm wholesale tier rates by phone before final dispatch.
                </p>
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOrder} className="space-y-3">
                <div>
                  <label htmlFor="drawer-name" className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-[#FF6B00]" />
                    Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="drawer-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Smith"
                    className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="drawer-phone" className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-[#FF6B00]" />
                      Phone Number <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="drawer-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) 000-0000"
                      className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="drawer-email" className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3 text-[#FF6B00]" />
                      Email <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="drawer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@store.com"
                      className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="drawer-business-name" className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] flex items-center gap-1 mb-1">
                    <Building className="w-3 h-3 text-[#FF6B00]" />
                    Business / Store Name (Optional)
                  </label>
                  <input
                    id="drawer-business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. OKC Smoke & Vape LLC"
                    className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="drawer-notes" className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] flex items-center gap-1 mb-1">
                    <FileText className="w-3 h-3 text-[#FF6B00]" />
                    Delivery & Pickup Notes / Preferences
                  </label>
                  <textarea
                    id="drawer-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Same-day OKC pickup, metro delivery, flavor requests, etc."
                    className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] transition-all resize-none"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  className="w-full py-3 bg-[#FF6B00] hover:bg-[#E85F00] disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-3 hover:scale-[1.01] active:scale-[0.99]"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting Order Request...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>Submit Wholesale Order ({totalUnits} Units)</span>
                    </>
                  )}
                </button>

                <div className="text-[10px] text-[#858C96] text-center flex items-center justify-center gap-2">
                  <span>Direct phone quotes:</span>
                  <a href="tel:4057682975" className="font-bold text-[#F7F7F5] hover:text-[#FF6B00]">
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
