import React, { useState, useEffect } from 'react';
import {
  Package,
  MapPin,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Phone,
  Mail,
  Building,
  User,
  ShieldCheck,
  FileText,
  MessageSquare,
  AlertCircle,
  Loader2,
  Lock,
  Save,
  Ban,
  DollarSign,
  Plus,
  RefreshCw,
} from 'lucide-react';
import {
  fetchAdminOrder,
  updateAdminOrderStatus,
  updateAdminOrderItemStatus,
  resolveAdminOrderIssue,
  addAdminInternalNote,
  type OrderRecord,
  type OrderItemRecord,
  type GeneralOrderStatus,
  type ItemFulfillmentStatus,
} from '../../lib/fulfillmentApi';

interface AdminOrderDetailProps {
  orderId: string;
}

export default function AdminOrderDetail({ orderId }: AdminOrderDetailProps) {
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Item preparation working state (keyed by itemId)
  const [itemForms, setItemForms] = useState<
    Record<
      string,
      {
        status: ItemFulfillmentStatus;
        physicalQty: number;
        blockOnline: boolean;
        reason: string;
      }
    >
  >({});
  const [savingItem, setSavingItem] = useState<string | null>(null);

  // Internal Note form
  const [internalNoteInput, setInternalNoteInput] = useState('');
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Status transition state
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Resolution modal state
  const [resolvingItem, setResolvingItem] = useState<OrderItemRecord | null>(null);
  const [resolutionType, setResolutionType] = useState<
    'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'CUSTOMER_WILL_WAIT' | 'SUBSTITUTION' | 'CANCEL_ORDER'
  >('ACCEPT_PARTIAL');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const loadOrder = async () => {
    setIsLoading(true);
    setError('');
    try {
      const ord = await fetchAdminOrder(orderId);
      setOrder(ord);

      // Initialize form state for line items
      const initialForms: Record<string, any> = {};
      for (const item of ord.lineItems) {
        initialForms[item.id] = {
          status: item.itemFulfillmentStatus,
          physicalQty: item.physicalQuantityAvailable,
          blockOnline: false,
          reason: item.resolutionNotes || '',
        };
      }
      setItemForms(initialForms);
    } catch (err: any) {
      setError(err.message || `Failed to load order ${orderId}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrder();
  }, [orderId]);

  const handleSaveItemFulfillment = async (item: OrderItemRecord) => {
    const form = itemForms[item.id];
    if (!form) return;

    setSavingItem(item.id);
    setError('');
    setSuccessMsg('');

    try {
      const res = await updateAdminOrderItemStatus({
        orderId,
        itemId: item.id,
        status: form.status,
        physicalQuantityAvailable: Number(form.physicalQty),
        blockProductOnline: form.blockOnline,
        reason: form.reason || undefined,
      });

      setOrder(res.order);
      setSuccessMsg(
        `Fulfillment updated for "${item.name}". ${
          res.productBlocked ? 'Product temporarily blocked online.' : ''
        }`
      );
    } catch (err: any) {
      setError(err.message || 'Failed to update item fulfillment.');
    } finally {
      setSavingItem(null);
    }
  };

  const handleStatusTransition = async (newStatus: GeneralOrderStatus, force = false) => {
    setIsUpdatingStatus(true);
    setError('');
    setSuccessMsg('');

    try {
      const updated = await updateAdminOrderStatus({
        orderId,
        status: newStatus,
        force,
      });
      setOrder(updated);
      setSuccessMsg(`Order status successfully advanced to ${newStatus.replace(/_/g, ' ')}.`);
    } catch (err: any) {
      setError(err.message || 'Failed to update order status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleAddInternalNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internalNoteInput.trim()) return;

    setIsSubmittingNote(true);
    setError('');
    try {
      const updated = await addAdminInternalNote(orderId, internalNoteInput.trim());
      setOrder(updated);
      setInternalNoteInput('');
      setSuccessMsg('Internal staff note recorded.');
    } catch (err: any) {
      setError(err.message || 'Failed to record internal note.');
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleSubmitResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingItem) return;

    setIsSubmittingResolution(true);
    setError('');
    try {
      const updated = await resolveAdminOrderIssue({
        orderId,
        itemId: resolvingItem.id,
        resolution: resolutionType,
        notes: resolutionNotes,
      });
      setOrder(updated);
      setResolvingItem(null);
      setResolutionNotes('');
      setSuccessMsg(`Inventory issue resolved: ${resolutionType.replace(/_/g, ' ')}. Totals recalculated.`);
    } catch (err: any) {
      setError(err.message || 'Failed to resolve inventory issue.');
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
          <p className="text-xs text-[#858C96]">Loading order preparation workspace...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5] p-8 text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-base font-bold">Order Not Found</h2>
        <a href="/admin/orders" className="text-xs text-[#FF6B00] underline">
          Back to Orders Queue
        </a>
      </div>
    );
  }

  const hasUnresolvedIssues = order.lineItems.some((i) =>
    ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE', 'PENDING_CHECK'].includes(i.itemFulfillmentStatus)
  );

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Top Header */}
      <header className="bg-[#15191F] border-b border-[#2A3038] px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/admin/orders"
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors"
              title="Back to Orders Queue"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg font-black text-[#F7F7F5]">
                  Order #{order.orderNumber}
                </h1>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    order.fulfillmentMethod === 'PICKUP'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  }`}
                >
                  {order.fulfillmentMethod}
                </span>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                    order.hasInventoryIssue
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500 animate-pulse'
                      : order.status === 'READY_FOR_PICKUP' || order.status === 'DELIVERED' || order.status === 'COMPLETED'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-[#0B0D10] text-[#B8BDC5] border border-[#2A3038]'
                  }`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-[#858C96]">
                {order.customerName} {order.businessName ? `· ${order.businessName}` : ''} · Placed {new Date(order.createdAt).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadOrder}
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Workflow Action Bar */}
        <div className="bg-[#15191F] rounded-2xl p-4 sm:p-5 border border-[#2A3038] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">
              Order Lifecycle Controls
            </span>
            {hasUnresolvedIssues && (
              <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Unresolved item shortages exist
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2.5">
            {order.status === 'ORDER_RECEIVED' && (
              <button
                disabled={isUpdatingStatus}
                onClick={() => handleStatusTransition('PROCESSING')}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Start Processing Order
              </button>
            )}

            {order.fulfillmentMethod === 'PICKUP' && (
              <>
                <button
                  disabled={isUpdatingStatus || order.status === 'READY_FOR_PICKUP' || order.status === 'PICKED_UP' || order.status === 'COMPLETED'}
                  onClick={() => handleStatusTransition('READY_FOR_PICKUP')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Ready for Pickup</span>
                </button>

                <button
                  disabled={isUpdatingStatus || order.status !== 'READY_FOR_PICKUP'}
                  onClick={() => handleStatusTransition('PICKED_UP')}
                  className="px-4 py-2.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>Mark Picked Up & Complete</span>
                </button>
              </>
            )}

            {order.fulfillmentMethod === 'DELIVERY' && (
              <>
                <button
                  disabled={isUpdatingStatus || order.status === 'OUT_FOR_DELIVERY' || order.status === 'DELIVERED' || order.status === 'COMPLETED'}
                  onClick={() => handleStatusTransition('OUT_FOR_DELIVERY')}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Mark Out for Delivery</span>
                </button>

                <button
                  disabled={isUpdatingStatus || order.status !== 'OUT_FOR_DELIVERY'}
                  onClick={() => handleStatusTransition('DELIVERED')}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-40 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Delivered & Complete</span>
                </button>
              </>
            )}

            <button
              disabled={isUpdatingStatus || order.status === 'CANCELLED'}
              onClick={() => {
                const reason = prompt('Reason for cancelling order:');
                if (reason) {
                  updateAdminOrderStatus({ orderId, status: 'CANCELLED', notes: reason }).then((o) => setOrder(o));
                }
              }}
              className="px-4 py-2.5 bg-rose-900/40 hover:bg-rose-800 text-rose-300 font-bold text-xs rounded-xl border border-rose-700/50 transition-colors cursor-pointer disabled:opacity-40 ml-auto"
            >
              Cancel Order
            </button>
          </div>
        </div>

        {/* Top Info Grid: Customer Info & Fulfillment Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Card */}
          <div className="bg-[#15191F] rounded-2xl p-5 border border-[#2A3038] space-y-2.5 text-xs">
            <span className="text-[10px] font-bold text-[#858C96] uppercase tracking-wider block">Customer & Contact</span>
            <div className="font-bold text-sm text-[#F7F7F5]">{order.customerName}</div>
            {order.businessName && <div className="text-[#B8BDC5] font-semibold">{order.businessName}</div>}
            <div className="text-[#858C96] flex items-center gap-1.5">
              <Mail className="w-3 h-3 text-[#FF6B00]" />
              <span>{order.email}</span>
            </div>
            <div className="text-[#858C96] flex items-center gap-1.5">
              <Phone className="w-3 h-3 text-[#FF6B00]" />
              <span>{order.phone}</span>
            </div>
          </div>

          {/* Fulfillment Details Card */}
          <div className="bg-[#15191F] rounded-2xl p-5 border border-[#2A3038] space-y-2.5 text-xs">
            <span className="text-[10px] font-bold text-[#858C96] uppercase tracking-wider block">
              {order.fulfillmentMethod === 'PICKUP' ? 'Warehouse Pickup Station' : 'Commercial Delivery Address'}
            </span>
            {order.fulfillmentMethod === 'PICKUP' && order.pickupInfo && (
              <>
                <div className="font-bold text-[#F7F7F5]">{order.pickupInfo.locationSnapshot.locationName}</div>
                <div className="text-[#B8BDC5]">{order.pickupInfo.locationSnapshot.address.street}, {order.pickupInfo.locationSnapshot.address.city}, OK</div>
                <div className="text-[11px] text-[#858C96]">Hours: {order.pickupInfo.locationSnapshot.hours}</div>
                <div className="text-[11px] text-[#858C96]">Status: <strong className="text-[#F7F7F5]">{order.pickupInfo.pickupStatus}</strong></div>
              </>
            )}

            {order.fulfillmentMethod === 'DELIVERY' && order.deliveryInfo && (
              <>
                <div className="font-bold text-[#F7F7F5]">{order.deliveryInfo.addressSnapshot.recipientName}</div>
                <div className="text-[#B8BDC5]">
                  {order.deliveryInfo.addressSnapshot.street} {order.deliveryInfo.addressSnapshot.unit || ''}, {order.deliveryInfo.addressSnapshot.city}, {order.deliveryInfo.addressSnapshot.state} {order.deliveryInfo.addressSnapshot.zip}
                </div>
                {order.deliveryInfo.addressSnapshot.deliveryInstructions && (
                  <div className="text-[11px] text-[#858C96]">Note: {order.deliveryInfo.addressSnapshot.deliveryInstructions}</div>
                )}
                <div className="text-[11px] text-[#858C96]">Status: <strong className="text-[#F7F7F5]">{order.deliveryInfo.deliveryStatus}</strong></div>
              </>
            )}
          </div>

          {/* Financial Summary */}
          <div className="bg-[#15191F] rounded-2xl p-5 border border-[#2A3038] space-y-2 text-xs">
            <span className="text-[10px] font-bold text-[#858C96] uppercase tracking-wider block">Invoice Summary</span>
            <div className="flex justify-between text-[#858C96]">
              <span>Product Subtotal</span>
              <span className="font-mono text-[#F7F7F5]">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#858C96]">
              <span>Delivery Fee</span>
              <span className="font-mono text-[#F7F7F5]">${order.deliveryFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#858C96]">
              <span>Taxes</span>
              <span className="font-mono text-[#F7F7F5]">${order.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-[#2A3038] font-bold text-sm text-[#FF6B00]">
              <span>Final Total</span>
              <span className="font-mono">${order.total.toFixed(2)}</span>
            </div>
            <div className="text-[10px] text-[#858C96] pt-1">
              Payment Status: <span className="text-[#F7F7F5] font-bold">{order.paymentStatus}</span>
            </div>
          </div>
        </div>

        {/* INDIVIDUAL ORDER ITEM FULFILLMENT STATUS (Core warehouse prep workspace) */}
        <div className="bg-[#15191F] rounded-2xl border border-[#2A3038] overflow-hidden space-y-4 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2A3038] pb-4">
            <div>
              <h2 className="text-base font-black text-[#F7F7F5] tracking-tight flex items-center gap-2">
                <Package className="w-5 h-5 text-[#FF6B00]" />
                Warehouse Item Physical Verification Workspace
              </h2>
              <p className="text-xs text-[#858C96] mt-0.5">
                Staff physically checks store shelves. Mark availability independently per SKU.
              </p>
            </div>
            <span className="text-xs font-bold text-[#858C96]">
              {order.lineItems.length} Product Line{order.lineItems.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-4">
            {order.lineItems.map((item, idx) => {
              const form = itemForms[item.id] || {
                status: item.itemFulfillmentStatus,
                physicalQty: item.physicalQuantityAvailable,
                blockOnline: false,
                reason: '',
              };
              const isSaving = savingItem === item.id;
              const hasDiscrepancy = form.physicalQty < item.quantityOrdered || ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(form.status);

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 ${
                    hasDiscrepancy
                      ? 'bg-amber-500/[0.04] border-amber-500/40'
                      : 'bg-[#1B2027] border-[#2A3038]'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Item Information */}
                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-[#0B0D10] text-[#858C96] text-[10px] font-mono font-bold flex items-center justify-center border border-[#2A3038]">
                          {idx + 1}
                        </span>
                        <h4 className="text-sm font-bold text-[#F7F7F5]">{item.name}</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#858C96] mt-1 ml-7">
                        <span>SKU: <strong className="text-[#B8BDC5]">{item.sku}</strong></span>
                        {item.flavor && <span>Flavor: <strong className="text-[#B8BDC5]">{item.flavor}</strong></span>}
                        <span>Price: <strong className="font-mono text-[#F7F7F5]">${item.pricePerUnit.toFixed(2)}</strong></span>
                        <span>Zoho/System Inventory: <strong className="font-mono text-emerald-400">{item.systemInventory}</strong></span>
                      </div>
                    </div>

                    {/* Quantity Counters */}
                    <div className="flex items-center gap-4 text-xs">
                      <div className="bg-[#0B0D10] p-2.5 rounded-xl border border-[#2A3038] text-center min-w-[80px]">
                        <span className="text-[10px] font-bold text-[#858C96] uppercase block">Ordered</span>
                        <span className="font-mono font-black text-sm text-[#F7F7F5]">{item.quantityOrdered}</span>
                      </div>

                      <div className="bg-[#0B0D10] p-2.5 rounded-xl border border-[#2A3038] text-center min-w-[100px]">
                        <span className="text-[10px] font-bold text-[#858C96] uppercase block">Physical Count</span>
                        <input
                          type="number"
                          min="0"
                          max="999"
                          value={form.physicalQty}
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                            setItemForms((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                physicalQty: val,
                                status: val === 0 ? 'OUT_OF_STOCK' : val < item.quantityOrdered ? 'PARTIALLY_AVAILABLE' : 'AVAILABLE',
                              },
                            }));
                          }}
                          className="w-16 text-center font-mono font-black text-sm text-emerald-400 bg-transparent border-b border-[#2A3038] focus:border-[#FF6B00] outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons for Warehouse Staff (Large, Touch-Friendly) */}
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#2A3038]/60">
                    <button
                      type="button"
                      onClick={() => {
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: 'AVAILABLE',
                            physicalQty: item.quantityOrdered,
                          },
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        form.status === 'AVAILABLE'
                          ? 'bg-emerald-500 text-black shadow-sm'
                          : 'bg-[#15191F] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038]'
                      }`}
                    >
                      Available
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: 'OUT_OF_STOCK',
                            physicalQty: 0,
                            blockOnline: true,
                          },
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        form.status === 'OUT_OF_STOCK'
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-[#15191F] text-[#858C96] hover:text-rose-400 border border-[#2A3038]'
                      }`}
                    >
                      Out of Stock
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const partial = Math.max(1, Math.floor(item.quantityOrdered / 2));
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: 'PARTIALLY_AVAILABLE',
                            physicalQty: partial,
                          },
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        form.status === 'PARTIALLY_AVAILABLE'
                          ? 'bg-amber-500 text-black shadow-sm'
                          : 'bg-[#15191F] text-[#858C96] hover:text-amber-400 border border-[#2A3038]'
                      }`}
                    >
                      Partially Available
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: 'TEMPORARILY_UNAVAILABLE',
                            physicalQty: 0,
                          },
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        form.status === 'TEMPORARILY_UNAVAILABLE'
                          ? 'bg-orange-500 text-black shadow-sm'
                          : 'bg-[#15191F] text-[#858C96] hover:text-orange-400 border border-[#2A3038]'
                      }`}
                    >
                      Temporarily Unavailable
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setItemForms((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: 'FULFILLED',
                            physicalQty: item.quantityOrdered,
                          },
                        }));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        form.status === 'FULFILLED'
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-[#15191F] text-[#858C96] hover:text-blue-400 border border-[#2A3038]'
                      }`}
                    >
                      Fulfilled
                    </button>
                  </div>

                  {/* Temporary Online Block Checkbox & Notes */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <label className="flex items-center gap-2 text-xs text-[#B8BDC5] cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={form.blockOnline}
                        onChange={(e) =>
                          setItemForms((prev) => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], blockOnline: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-[#FF6B00] bg-[#0B0D10] border-[#2A3038] cursor-pointer"
                      />
                      <span className={form.blockOnline ? 'text-amber-400 font-bold' : ''}>
                        Mark Product Temporarily Out of Stock Online (blocks new website orders immediately)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      {/* If item has a shortage, provide fast resolution trigger */}
                      {['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(item.itemFulfillmentStatus) && (
                        <button
                          type="button"
                          onClick={() => setResolvingItem(item)}
                          className="px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition-colors cursor-pointer"
                        >
                          Resolve Shortage...
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveItemFulfillment(item)}
                        className="px-4 py-1.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      >
                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Save Fulfillment Update</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Staff Resolution Modal */}
        {resolvingItem && (
          <div className="fixed inset-0 z-50 bg-[#0B0D10]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleSubmitResolution}
              className="bg-[#15191F] border border-[#2A3038] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-[#F7F7F5] uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                  Resolve Inventory Shortage: {resolvingItem.name}
                </h3>
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="text-[#858C96] hover:text-[#F7F7F5] p-1 cursor-pointer"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-[#858C96]">
                Customer ordered <strong>{resolvingItem.quantityOrdered}</strong>. Physical stock verification found{' '}
                <strong className="text-amber-400">{resolvingItem.physicalQuantityAvailable}</strong>.
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] block mb-1">
                  Resolution Action
                </label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] focus:border-[#FF6B00] outline-none"
                >
                  <option value="ACCEPT_PARTIAL">Customer Accepted Partial Quantity ({resolvingItem.physicalQuantityAvailable} units)</option>
                  <option value="REMOVE_ITEM">Remove Unavailable Item from Order</option>
                  <option value="CUSTOMER_WILL_WAIT">Customer Will Wait for Restock</option>
                  <option value="SUBSTITUTION">Substitution Approved by Customer</option>
                  <option value="CANCEL_ORDER">Cancel Entire Order</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] block mb-1">
                  Staff Resolution Notes
                </label>
                <textarea
                  rows={2}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Spoke with store manager Taylor; agreed to six units now."
                  className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] focus:border-[#FF6B00] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingItem(null)}
                  className="px-4 py-2 bg-[#1B2027] text-xs font-bold text-[#858C96] rounded-xl hover:bg-[#2A3038] transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolution}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingResolution ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Apply Resolution & Recalculate Totals</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Internal Staff Notes Area (Private to Authorized Business Staff) */}
        <div className="bg-[#15191F] rounded-2xl p-5 sm:p-6 border border-[#2A3038] space-y-4 shadow-lg">
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <Lock className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5]">
              Internal Staff Notes (Hidden from Customers)
            </h3>
          </div>

          <p className="text-xs text-[#858C96]">
            Confidential warehouse communications, phone call logs, and customer arrangements. Never visible in customer portals or notifications.
          </p>

          {/* Notes List */}
          {(!order.internalNotes || order.internalNotes.length === 0) ? (
            <div className="py-4 text-center text-xs text-[#858C96] bg-[#0B0D10] rounded-xl border border-[#2A3038]/60">
              No internal staff notes recorded for this order yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {order.internalNotes.map((n) => (
                <div key={n.id} className="bg-[#0B0D10] p-3.5 rounded-xl border border-[#2A3038] text-xs space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-[#858C96]">
                    <span className="font-bold text-[#FF6B00]">{n.authorName}</span>
                    <span>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                  <p className="text-[#F7F7F5] leading-relaxed">{n.note}</p>
                </div>
              ))}
            </div>
          )}

          {/* Add Note Form */}
          <form onSubmit={handleAddInternalNote} className="flex gap-2.5 pt-2">
            <input
              type="text"
              value={internalNoteInput}
              onChange={(e) => setInternalNoteInput(e.target.value)}
              placeholder="e.g. Spoke with manager John at 2:15 PM; requested delivery after 3 PM..."
              className="flex-1 bg-[#0B0D10] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:border-[#FF6B00] outline-none"
            />
            <button
              type="submit"
              disabled={isSubmittingNote || !internalNoteInput.trim()}
              className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shrink-0"
            >
              {isSubmittingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Add Staff Note</span>
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
