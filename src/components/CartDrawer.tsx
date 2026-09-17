import React, { useState, useEffect, useCallback } from 'react';
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
  MapPin,
  Truck,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
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
import {
  fetchFulfillmentConfig,
  validateDeliveryAddress,
  fetchCustomerAddresses,
  type FulfillmentConfig,
  type CustomerSavedAddress,
} from '../lib/fulfillmentApi';

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

  // ── Fulfillment State ──────────────────────────────────────────────────────
  const [fulfillmentMethod, setFulfillmentMethod] = useState<'PICKUP' | 'DELIVERY' | null>(null);
  const [fulfillmentConfig, setFulfillmentConfig] = useState<FulfillmentConfig | null>(null);

  // Pickup specific fields
  const [pickupDate, setPickupDate] = useState('');
  const [pickupTime, setPickupTime] = useState('');

  // Delivery specific fields
  const [savedAddresses, setSavedAddresses] = useState<CustomerSavedAddress[]>([]);
  const [selectedAddressMode, setSelectedAddressMode] = useState<'saved' | 'new'>('new');
  const [selectedAddressId, setSelectedAddressId] = useState<string>('');
  const [deliveryRecipient, setDeliveryRecipient] = useState('');
  const [deliveryStreet, setDeliveryStreet] = useState('');
  const [deliveryUnit, setDeliveryUnit] = useState('');
  const [deliveryCity, setDeliveryCity] = useState('');
  const [deliveryState, setDeliveryState] = useState('OK');
  const [deliveryZip, setDeliveryZip] = useState('');
  const [deliveryPhone, setDeliveryPhone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Live validation & fee calculation
  const [calculatedDeliveryFee, setCalculatedDeliveryFee] = useState<number>(0);
  const [deliveryValidationResult, setDeliveryValidationResult] = useState<{
    eligible: boolean;
    reason?: string;
  } | null>(null);
  const [isValidatingDelivery, setIsValidatingDelivery] = useState(false);

  const syncCart = () => {
    setItems([...getDraftOrder()]);
  };

  // Synchronize cart whenever drawer opens
  useEffect(() => {
    if (isOpen) {
      syncCart();
      // Load fulfillment config (pickup warehouse details, hours, contact, delivery rules)
      fetchFulfillmentConfig()
        .then((cfg) => setFulfillmentConfig(cfg))
        .catch((e) => console.warn('[Cart] Config load error:', e.message));

      // Check if logged in customer has saved addresses & profile
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('woo_session_token');
        if (token) {
          fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
            .then((r) => r.json())
            .then((data) => {
              if (data.authenticated && data.user) {
                if (!name) setName(data.user.contactName || '');
                if (!email) setEmail(data.user.email || '');
                if (!businessName) setBusinessName(data.user.businessName || '');
                if (!deliveryRecipient) setDeliveryRecipient(data.user.contactName || data.user.businessName || '');
              }
            })
            .catch(() => {});

          fetchCustomerAddresses()
            .then((addrs) => {
              setSavedAddresses(addrs);
              const def = addrs.find((a) => a.isDefault && a.type === 'delivery') || addrs[0];
              if (def) {
                setSelectedAddressMode('saved');
                setSelectedAddressId(def.id);
                setDeliveryRecipient(def.recipientName);
                setDeliveryStreet(def.street);
                setDeliveryUnit(def.unit || '');
                setDeliveryCity(def.city);
                setDeliveryState(def.state);
                setDeliveryZip(def.zip);
                setDeliveryPhone(def.phone);
                setDeliveryInstructions(def.deliveryInstructions || '');
              }
            })
            .catch(() => {});
        }
      }
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
  const subtotalAmount = getDraftOrderTotal();

  // Validate delivery address whenever delivery fields or subtotal change
  const runDeliveryValidation = useCallback(async () => {
    if (fulfillmentMethod !== 'DELIVERY') {
      setCalculatedDeliveryFee(0);
      setDeliveryValidationResult(null);
      return;
    }

    if (!deliveryStreet.trim() || !deliveryCity.trim() || !deliveryZip.trim()) {
      setDeliveryValidationResult(null);
      setCalculatedDeliveryFee(0);
      return;
    }

    setIsValidatingDelivery(true);
    try {
      const res = await validateDeliveryAddress(
        {
          streetAddress: deliveryStreet.trim(),
          suiteUnit: deliveryUnit.trim() || undefined,
          city: deliveryCity.trim(),
          state: deliveryState.trim() || 'OK',
          zipCode: deliveryZip.trim(),
          recipientName: deliveryRecipient.trim() || name.trim(),
          phone: deliveryPhone.trim() || phone.trim(),
        },
        subtotalAmount
      );

      setDeliveryValidationResult({
        eligible: res.eligible,
        reason: res.reason,
      });
      setCalculatedDeliveryFee(res.deliveryFee);
    } catch (err: any) {
      setDeliveryValidationResult({
        eligible: false,
        reason: err.message || 'Delivery validation error.',
      });
      setCalculatedDeliveryFee(0);
    } finally {
      setIsValidatingDelivery(false);
    }
  }, [
    fulfillmentMethod,
    deliveryStreet,
    deliveryCity,
    deliveryState,
    deliveryZip,
    deliveryUnit,
    deliveryRecipient,
    name,
    deliveryPhone,
    phone,
    subtotalAmount,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      runDeliveryValidation();
    }, 300);
    return () => clearTimeout(timer);
  }, [runDeliveryValidation]);

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

  const handleSelectSavedAddress = (addressId: string) => {
    setSelectedAddressId(addressId);
    if (addressId === 'new') {
      setSelectedAddressMode('new');
      setDeliveryStreet('');
      setDeliveryUnit('');
      setDeliveryCity('');
      setDeliveryState('OK');
      setDeliveryZip('');
      setDeliveryPhone('');
      setDeliveryInstructions('');
    } else {
      setSelectedAddressMode('saved');
      const found = savedAddresses.find((a) => a.id === addressId);
      if (found) {
        setDeliveryRecipient(found.recipientName);
        setDeliveryStreet(found.street);
        setDeliveryUnit(found.unit || '');
        setDeliveryCity(found.city);
        setDeliveryState(found.state);
        setDeliveryZip(found.zip);
        setDeliveryPhone(found.phone);
        setDeliveryInstructions(found.deliveryInstructions || '');
      }
    }
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;

    if (!fulfillmentMethod) {
      setErrorMessage('Please select how you would like to receive your order: Pickup or Delivery.');
      setStatus('error');
      return;
    }

    if (fulfillmentMethod === 'DELIVERY') {
      if (!deliveryStreet.trim() || !deliveryCity.trim() || !deliveryZip.trim()) {
        setErrorMessage('Complete delivery address (street, city, state, ZIP) is required for delivery orders.');
        setStatus('error');
        return;
      }
      if (deliveryValidationResult && !deliveryValidationResult.eligible) {
        setErrorMessage(deliveryValidationResult.reason || 'Delivery is currently unavailable to this address.');
        setStatus('error');
        return;
      }
    }

    setStatus('submitting');
    setErrorMessage('');

    try {
      const lineItems = items.map((ci) => ({
        id: ci.product.id,
        sku: ci.product.sku,
        name: ci.product.name,
        flavor: ci.flavor,
        quantity: ci.quantity,
        pricePerUnit: ci.pricePerUnit,
        zoho_item_id: (ci.product as any).zoho_item_id,
      }));

      const backendRes = await submitWholesaleOrder({
        customerName: name,
        businessName,
        email,
        phone,
        notes,
        fulfillmentMethod,
        pickupInfo:
          fulfillmentMethod === 'PICKUP'
            ? {
                requestedPickupDate: pickupDate || undefined,
                requestedPickupTime: pickupTime || undefined,
              }
            : undefined,
        deliveryInfo:
          fulfillmentMethod === 'DELIVERY'
            ? {
                addressSnapshot: {
                  recipientName: deliveryRecipient || name,
                  businessName,
                  street: deliveryStreet,
                  unit: deliveryUnit || undefined,
                  city: deliveryCity,
                  state: deliveryState || 'OK',
                  zip: deliveryZip,
                  phone: deliveryPhone || phone,
                  deliveryInstructions: deliveryInstructions || undefined,
                },
                deliveryInstructions: deliveryInstructions || undefined,
              }
            : undefined,
        lineItems,
      });

      const genId = backendRes?.orderId || `WOO-${Date.now().toString().slice(-6)}`;
      setSubmittedOrderId(genId);
      setStatus('success');
      clearDraftOrder();
    } catch (err: any) {
      setStatus('error');
      setErrorMessage(err.message || 'Unable to submit order. Please call (405) 768-2975.');
    }
  };

  const handleResetForm = () => {
    setStatus('idle');
    setSubmittedOrderId(null);
    setFulfillmentMethod(null);
    onClose();
  };

  const defaultPickup = fulfillmentConfig?.pickupLocation || {
    locationName: 'Wholesale of Oklahoma Central Warehouse',
    address: { street: '4500 S Bryant Ave', city: 'Oklahoma City', state: 'OK', zip: '73135' },
    hours: 'Mon–Sat: 9:00 AM – 8:00 PM, Sun: 11:00 AM – 8:00 PM',
    phone: '(405) 768-2975',
    instructions:
      'Pull into the commercial loading area at 4500 S Bryant Ave. Present your Order Reference Number at the wholesale dispatch counter.',
  };

  const finalTotalAmount = Math.round((subtotalAmount + (fulfillmentMethod === 'DELIVERY' ? calculatedDeliveryFee : 0)) * 100) / 100;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 ${
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
        className={`fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[520px] max-w-full bg-white text-slate-900 shadow-2xl border-l border-slate-200 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="bg-slate-50 text-slate-900 px-5 py-4 flex items-center justify-between shadow-xs shrink-0 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6B00] border border-orange-200">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900">Wholesale Cart & Fulfillment</h2>
                {totalUnits > 0 && (
                  <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-xs">
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
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
            aria-label="Close Shopping Cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        {status === 'success' ? (
          // Success Screen
          <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-600 shadow-inner">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-slate-900">Wholesale Order Confirmed!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Order Reference: <span className="font-mono font-bold text-[#FF6B00]">{submittedOrderId}</span>
              </p>
            </div>

            {fulfillmentMethod === 'PICKUP' ? (
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-300 text-left space-y-2 text-xs w-full">
                <div className="flex items-center gap-2 text-amber-900 font-bold uppercase tracking-wider">
                  <MapPin className="w-4 h-4 text-amber-600" />
                  <span>Pickup Order Registered</span>
                </div>
                <p className="text-slate-900 font-semibold">
                  Location: {defaultPickup.address.street}, {defaultPickup.address.city}, {defaultPickup.address.state}
                </p>
                <p className="text-slate-600">Hours: {defaultPickup.hours}</p>
                <div className="p-2.5 rounded-xl bg-amber-100/70 text-amber-900 text-[11px] font-medium leading-relaxed">
                  <strong>Important:</strong> You will be notified via email when your order has been physically assembled and is ready for pickup. Please do not proceed to the warehouse until you receive your ready-for-pickup confirmation.
                </div>
              </div>
            ) : (
              <div className="p-4 bg-sky-50 rounded-2xl border border-sky-300 text-left space-y-2 text-xs w-full">
                <div className="flex items-center gap-2 text-sky-900 font-bold uppercase tracking-wider">
                  <Truck className="w-4 h-4 text-sky-600" />
                  <span>Commercial Metro Delivery Order</span>
                </div>
                <p className="text-slate-900 font-semibold">
                  Destination: {deliveryStreet}, {deliveryCity}, {deliveryState} {deliveryZip}
                </p>
                <p className="text-slate-600">
                  You will receive email notifications as our warehouse begins processing, when your shipment is out for delivery, and upon delivery completion.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-2.5 w-full pt-2">
              <a
                href="/account/orders"
                className="py-3 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full flex items-center justify-center gap-2 shadow-lg transition-colors"
              >
                <Package className="w-4 h-4 text-white" />
                <span>View Order Status in Account</span>
              </a>
              <button
                onClick={handleResetForm}
                className="py-2.5 bg-slate-100 border border-slate-300 text-slate-800 text-xs font-bold rounded-full hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Continue Browsing Wholesale Catalog
              </button>
            </div>
          </div>
        ) : items.length === 0 ? (
          // Empty Cart Screen
          <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
              <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Your Wholesale Cart is Empty</h3>
              <p className="text-xs text-slate-500 max-w-xs mt-1 leading-relaxed">
                Add disposable vapes, pod kits, coils, juice, glass, or kratom from our live wholesale catalog to build your order.
              </p>
            </div>

            <button
              onClick={handleBrowseInventory}
              className="py-3 px-6 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full transition-all flex items-center gap-2 shadow-md cursor-pointer"
            >
              <Package className="w-4 h-4 text-white" />
              <span>Browse Live Inventory</span>
              <ArrowRight className="w-3.5 h-3.5 text-white/70" />
            </button>
          </div>
        ) : (
          // Active Cart Content
          <div className="flex-1 overflow-y-auto flex flex-col divide-y divide-slate-200">
            {/* Items Section */}
            <div className="p-4 sm:p-5 space-y-3 bg-white">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Order Items ({items.length} SKU{items.length !== 1 ? 's' : ''}, {totalUnits} units)
                </span>
                <button
                  onClick={handleClear}
                  className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {items.map((item, idx) => {
                  const unitPriceStr =
                    item.pricePerUnit > 0 ? `$${item.pricePerUnit.toFixed(2)}` : 'Wholesale Rate';

                  return (
                    <div
                      key={`${item.product.id}-${item.flavor || idx}`}
                      className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 shadow-xs flex items-center gap-3 transition-all hover:border-[#FF6B00]/50"
                    >
                      <div className="w-12 h-12 rounded-xl bg-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-200">
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
                          <Package className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug truncate">
                          {item.product.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-500 mt-0.5">
                          <span>SKU: {item.product.sku}</span>
                          {item.flavor && (
                            <span className="bg-slate-200/70 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                              {item.flavor}
                            </span>
                          )}
                          <span className="font-semibold text-[#FF6B00]">{unitPriceStr}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 bg-white rounded-lg p-1 shrink-0 border border-slate-200 shadow-xs">
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, -1, item.flavor)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 transition-colors cursor-pointer border border-slate-300"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center font-bold text-xs text-slate-900">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => handleQtyChange(item.product.id, item.quantity, 1, item.flavor)}
                          className="w-6 h-6 rounded bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-800 transition-colors cursor-pointer border border-slate-300"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => handleRemove(item.product.id, item.flavor)}
                        className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer shrink-0"
                        title="Remove item"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleBrowseInventory}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Add More Products from Catalog</span>
              </button>
            </div>

            {/* PICKUP AND DELIVERY OPTIONS (Mandatory Selection) */}
            <div className="p-4 sm:p-5 bg-slate-50/70 space-y-4">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                  How would you like to receive your order? <span className="text-rose-500">*</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Select official warehouse pickup in Oklahoma City or authorized metro commercial delivery.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFulfillmentMethod('PICKUP')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    fulfillmentMethod === 'PICKUP'
                      ? 'bg-amber-50 border-amber-500 text-amber-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <MapPin className={`w-5 h-5 ${fulfillmentMethod === 'PICKUP' ? 'text-amber-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                      Free ($0)
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 block">PICKUP</span>
                    <span className="text-[10px] text-slate-500 block">Central OKC Warehouse</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentMethod('DELIVERY')}
                  className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                    fulfillmentMethod === 'DELIVERY'
                      ? 'bg-sky-50 border-sky-500 text-sky-900 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Truck className={`w-5 h-5 ${fulfillmentMethod === 'DELIVERY' ? 'text-sky-600' : 'text-slate-400'}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700">
                      {subtotalAmount >= 500 ? 'Free ($500+)' : '$25 Metro'}
                    </span>
                  </div>
                  <div>
                    <span className="font-extrabold text-sm text-slate-900 block">DELIVERY</span>
                    <span className="text-[10px] text-slate-500 block">Storefront / Dock Delivery</span>
                  </div>
                </button>
              </div>

              {/* PICKUP DETAILS VIEW */}
              {fulfillmentMethod === 'PICKUP' && (
                <div className="bg-white p-4 rounded-2xl border border-amber-300 space-y-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-800 font-bold uppercase tracking-wider">
                      <MapPin className="w-4 h-4 text-amber-600" />
                      <span>Pickup Order Station</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">Delivery Fee: $0.00</span>
                  </div>

                  <div>
                    <p className="font-bold text-slate-900">{defaultPickup.locationName}</p>
                    <p className="text-slate-600">
                      {defaultPickup.address.street}, {defaultPickup.address.city}, {defaultPickup.address.state} {defaultPickup.address.zip}
                    </p>
                  </div>

                  <div className="text-[11px] text-slate-500 space-y-1 pt-1 border-t border-slate-200">
                    <p><strong className="text-slate-700">Hours:</strong> {defaultPickup.hours}</p>
                    <p><strong className="text-slate-700">Phone:</strong> {defaultPickup.phone}</p>
                    <p><strong className="text-slate-700">Instructions:</strong> {defaultPickup.instructions}</p>
                  </div>

                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                    <strong>Notice:</strong> You will be notified when your order is ready for pickup. Do not arrive at the warehouse until your order is assembled and marked ready.
                  </div>

                  {/* Optional Pickup Scheduling */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Requested Date (Optional)
                      </label>
                      <input
                        type="date"
                        value={pickupDate}
                        onChange={(e) => setPickupDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Requested Time (Optional)
                      </label>
                      <input
                        type="time"
                        value={pickupTime}
                        onChange={(e) => setPickupTime(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* DELIVERY DETAILS VIEW */}
              {fulfillmentMethod === 'DELIVERY' && (
                <div className="bg-white p-4 rounded-2xl border border-sky-300 space-y-3 text-xs shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sky-800 font-bold uppercase tracking-wider">
                      <Truck className="w-4 h-4 text-sky-600" />
                      <span>Commercial Delivery Address</span>
                    </div>
                    {isValidatingDelivery ? (
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <Loader2 className="w-3 h-3 animate-spin" /> Validating area...
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono font-bold text-sky-700">
                        Fee: ${calculatedDeliveryFee.toFixed(2)} {calculatedDeliveryFee === 0 ? '(Free over $500)' : ''}
                      </span>
                    )}
                  </div>

                  {/* Saved Addresses Dropdown if customer has saved addresses */}
                  {savedAddresses.length > 0 && (
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Use Saved Delivery Address
                      </label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => handleSelectSavedAddress(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                      >
                        <option value="new">+ Enter a new authorized delivery address</option>
                        {savedAddresses.map((addr) => (
                          <option key={addr.id} value={addr.id}>
                            {addr.recipientName} – {addr.street}, {addr.city} {addr.zip} {addr.isDefault ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Address Inputs */}
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Recipient / Store Contact Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={deliveryRecipient}
                        onChange={(e) => setDeliveryRecipient(e.target.value)}
                        placeholder="e.g. John Doe / Store Manager"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          Street Address <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={deliveryStreet}
                          onChange={(e) => setDeliveryStreet(e.target.value)}
                          placeholder="e.g. 1234 N Western Ave"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          Suite/Unit
                        </label>
                        <input
                          type="text"
                          value={deliveryUnit}
                          onChange={(e) => setDeliveryUnit(e.target.value)}
                          placeholder="B"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          City <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={deliveryCity}
                          onChange={(e) => setDeliveryCity(e.target.value)}
                          placeholder="Oklahoma City"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          State
                        </label>
                        <input
                          type="text"
                          required
                          value={deliveryState}
                          onChange={(e) => setDeliveryState(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                          ZIP Code <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={deliveryZip}
                          onChange={(e) => setDeliveryZip(e.target.value)}
                          placeholder="73101"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                        Delivery Instructions (Dock buzzer, gate codes, unloading hours)
                      </label>
                      <input
                        type="text"
                        value={deliveryInstructions}
                        onChange={(e) => setDeliveryInstructions(e.target.value)}
                        placeholder="Rear commercial dock, buzzer on west door"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:border-[#FF6B00] outline-none"
                      />
                    </div>
                  </div>

                  {/* Delivery Eligibility Warning / Status */}
                  {deliveryValidationResult && !deliveryValidationResult.eligible && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{deliveryValidationResult.reason || 'Delivery is currently unavailable to this address. Please select Pickup or contact Wholesale of Oklahoma.'}</span>
                    </div>
                  )}

                  {deliveryValidationResult && deliveryValidationResult.eligible && (
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                      <span>Eligible for Oklahoma City Metro commercial delivery ($150 minimum order).</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Contact & Dispatch Form */}
            <div className="p-4 sm:p-5 bg-white space-y-4">
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                    Account Contact Information
                  </h3>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Order updates, ready-for-pickup notifications, and invoice records will be sent to this email.
                </p>
              </div>

              {status === 'error' && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmitOrder} className="space-y-3">
                <div>
                  <label htmlFor="drawer-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
                    <User className="w-3 h-3 text-[#FF6B00]" />
                    Full Contact Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="drawer-name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Taylor Ross"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label htmlFor="drawer-phone" className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
                      <Phone className="w-3 h-3 text-[#FF6B00]" />
                      Phone Number <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="drawer-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) 000-0000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
                    />
                  </div>
                  <div>
                    <label htmlFor="drawer-email" className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
                      <Mail className="w-3 h-3 text-[#FF6B00]" />
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="drawer-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@retailer.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="drawer-business-name" className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
                    <Building className="w-3 h-3 text-[#FF6B00]" />
                    Business Entity Name (Optional)
                  </label>
                  <input
                    id="drawer-business-name"
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Wholesale of Oklahoma Retail Partner LLC"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
                  />
                </div>

                <div>
                  <label htmlFor="drawer-notes" className="text-[10px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1 mb-1">
                    <FileText className="w-3 h-3 text-[#FF6B00]" />
                    Order Notes & Special Requests
                  </label>
                  <textarea
                    id="drawer-notes"
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Special packing notes, invoice references, etc."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white resize-none"
                  />
                </div>

                {/* Final Order Price Breakdown */}
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Product Subtotal</span>
                    <span className="font-mono font-semibold text-slate-900">${subtotalAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Fulfillment ({fulfillmentMethod || 'Unselected'})</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {fulfillmentMethod === 'PICKUP'
                        ? '$0.00'
                        : fulfillmentMethod === 'DELIVERY'
                        ? `$${calculatedDeliveryFee.toFixed(2)}`
                        : '$0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-slate-200 text-sm font-black text-[#FF6B00]">
                    <span>Estimated Total</span>
                    <span className="font-mono">${finalTotalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={
                    status === 'submitting' ||
                    !fulfillmentMethod ||
                    (fulfillmentMethod === 'DELIVERY' && deliveryValidationResult !== null && !deliveryValidationResult.eligible)
                  }
                  className="w-full py-3 bg-[#FF6B00] hover:bg-[#E85F00] disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer mt-3"
                >
                  {status === 'submitting' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>Submitting Wholesale Order...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-white" />
                      <span>
                        Place Order ({totalUnits} Units · ${finalTotalAmount.toFixed(2)})
                      </span>
                    </>
                  )}
                </button>

                <div className="text-[10px] text-slate-500 text-center flex items-center justify-center gap-2">
                  <span>Questions or phone orders?</span>
                  <a href="tel:4057682975" className="font-bold text-slate-900 hover:text-[#FF6B00]">
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
