import React, { useState, useEffect } from 'react';
import {
  Package,
  MapPin,
  Clock,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Truck,
  Building,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchCustomerOrders,
  submitCustomerOrderAction,
  type OrderRecord,
  type OrderItemRecord,
} from '../../lib/fulfillmentApi';

export default function CustomerOrders() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const loadOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await fetchCustomerOrders();
      setOrders(list);
      if (list.length > 0 && !expandedOrder) {
        setExpandedOrder(list[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load order history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const handleCustomerResolution = async (
    orderId: string,
    itemId: string,
    resolution: 'ACCEPT_PARTIAL' | 'REMOVE_ITEM' | 'WAIT_FOR_PRODUCT' | 'REQUEST_SUBSTITUTE'
  ) => {
    const key = `${orderId}-${itemId}`;
    setActionInProgress(key);
    setActionSuccess(null);
    try {
      await submitCustomerOrderAction({ orderId, itemId, resolution });
      setActionSuccess(`Your decision (${resolution.replace(/_/g, ' ')}) has been submitted to warehouse staff.`);
      await loadOrders();
    } catch (err: any) {
      setError(err.message || 'Failed to submit resolution.');
    } finally {
      setActionInProgress(null);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        <p className="text-xs text-[#858C96]">Loading your wholesale orders & fulfillment records...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-4 shadow-xs">
        <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
          <Package className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900">No Orders Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You haven't placed any wholesale orders yet. Add products to your cart to submit your first pickup or delivery order.
          </p>
        </div>
        <a
          href="/#inventory"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full transition-colors shadow-xs"
        >
          <span>Browse Wholesale Catalog</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Wholesale Orders & Fulfillment Status</h2>
          <p className="text-xs text-slate-500">Track order processing, ready for pickup alerts, and delivery dispatch.</p>
        </div>
        <button
          onClick={loadOrders}
          className="px-3 py-1.5 bg-white hover:bg-slate-50 text-xs text-slate-700 hover:text-slate-900 rounded-lg border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <RefreshCw className="w-3 h-3" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="space-y-4">
        {orders.map((order) => {
          const isExpanded = expandedOrder === order.id;
          const hasIssue = order.hasInventoryIssue || order.customerActionRequired || order.status === 'INVENTORY_ISSUE' || order.status === 'CUSTOMER_ACTION_REQUIRED';

          return (
            <div
              key={order.id}
              className={`bg-white rounded-2xl border transition-all overflow-hidden shadow-xs ${
                hasIssue
                  ? 'border-amber-400 bg-amber-50/10'
                  : 'border-slate-200 hover:border-[#FF6B00]/40'
              }`}
            >
              {/* Order Header */}
              <div
                onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                className="p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 cursor-pointer select-none bg-slate-50/70 border-b border-slate-100"
              >
                <div className="flex items-center gap-3 min-w-[200px]">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                      order.fulfillmentMethod === 'PICKUP'
                        ? 'bg-amber-50 text-amber-600 border-amber-200'
                        : 'bg-sky-50 text-sky-600 border-sky-200'
                    }`}
                  >
                    {order.fulfillmentMethod === 'PICKUP' ? (
                      <MapPin className="w-5 h-5" />
                    ) : (
                      <Truck className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-black text-slate-900">
                        #{order.orderNumber}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          order.fulfillmentMethod === 'PICKUP'
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-sky-100 text-sky-800 border border-sky-200'
                        }`}
                      >
                        {order.fulfillmentMethod}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Placed on {new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* Status Badge */}
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        order.status === 'READY_FOR_PICKUP'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.status === 'OUT_FOR_DELIVERY'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : order.status === 'COMPLETED' || order.status === 'DELIVERED' || order.status === 'PICKED_UP'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : hasIssue
                          ? 'bg-amber-50 text-amber-800 border border-amber-300 animate-pulse'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {hasIssue && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                      {order.status.replace(/_/g, ' ')}
                    </span>
                    <p className="text-xs font-black text-[#FF6B00] mt-1 font-mono">
                      ${order.total.toFixed(2)}
                    </p>
                  </div>

                  <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Collapsible Content */}
              {isExpanded && (
                <div className="p-4 sm:p-6 space-y-6 bg-white">
                  {/* Action Required Banner if inventory shortage */}
                  {hasIssue && (
                    <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-amber-950">
                      <div className="flex items-center gap-2 text-amber-700">
                        <ShieldAlert className="w-5 h-5 shrink-0" />
                        <h4 className="text-xs font-black uppercase tracking-wider">
                          Action Required: Fulfillment Availability Exception
                        </h4>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {order.actionRequiredReason ||
                          'Our warehouse team discovered an inventory count difference while physically assembling your order. Please review the items below and select your preferred fulfillment resolution.'}
                      </p>
                    </div>
                  )}

                  {/* Visual Status Timeline */}
                  <div>
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
                      Order Fulfillment Timeline
                    </h4>
                    <div className="relative flex items-center justify-between max-w-2xl mx-auto py-2">
                      <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-slate-200 -translate-y-1/2 z-0" />
                      {order.fulfillmentMethod === 'PICKUP' ? (
                        <>
                          <TimelineStep
                            active={true}
                            label="Order Received"
                            timestamp={order.createdAt}
                          />
                          <TimelineStep
                            active={['PROCESSING', 'INVENTORY_ISSUE', 'CUSTOMER_ACTION_REQUIRED', 'READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED'].includes(order.status)}
                            label="Processing"
                          />
                          {hasIssue ? (
                            <TimelineStep
                              active={true}
                              alert={true}
                              label="Inventory Issue"
                            />
                          ) : null}
                          <TimelineStep
                            active={['READY_FOR_PICKUP', 'PICKED_UP', 'COMPLETED'].includes(order.status)}
                            label="Ready for Pickup"
                            timestamp={order.pickupInfo?.readyForPickupAt}
                          />
                          <TimelineStep
                            active={['PICKED_UP', 'COMPLETED'].includes(order.status)}
                            label="Picked Up"
                            timestamp={order.pickupInfo?.pickedUpAt}
                          />
                        </>
                      ) : (
                        <>
                          <TimelineStep
                            active={true}
                            label="Order Received"
                            timestamp={order.createdAt}
                          />
                          <TimelineStep
                            active={['PROCESSING', 'INVENTORY_ISSUE', 'CUSTOMER_ACTION_REQUIRED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status)}
                            label="Processing"
                          />
                          {hasIssue ? (
                            <TimelineStep
                              active={true}
                              alert={true}
                              label="Inventory Issue"
                            />
                          ) : null}
                          <TimelineStep
                            active={['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.status)}
                            label="Out for Delivery"
                            timestamp={order.deliveryInfo?.outForDeliveryAt}
                          />
                          <TimelineStep
                            active={['DELIVERED', 'COMPLETED'].includes(order.status)}
                            label="Delivered"
                            timestamp={order.deliveryInfo?.deliveredAt}
                          />
                        </>
                      )}
                    </div>
                  </div>

                  {/* Pickup / Delivery Info Card */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {order.fulfillmentMethod === 'PICKUP' && order.pickupInfo && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 text-amber-700">
                          <MapPin className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Official Pickup Warehouse</h4>
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          {order.pickupInfo.locationSnapshot.locationName}
                        </p>
                        <p className="text-xs text-slate-600">
                          {order.pickupInfo.locationSnapshot.address.street}, {order.pickupInfo.locationSnapshot.address.city}, {order.pickupInfo.locationSnapshot.address.state} {order.pickupInfo.locationSnapshot.address.zip}
                        </p>
                        <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                          <p><strong className="text-slate-700">Hours:</strong> {order.pickupInfo.locationSnapshot.hours}</p>
                          <p><strong className="text-slate-700">Contact:</strong> {order.pickupInfo.locationSnapshot.phone}</p>
                          <p><strong className="text-slate-700">Instructions:</strong> {order.pickupInfo.locationSnapshot.instructions}</p>
                          <p className="text-amber-700 font-medium mt-1">
                            * You will receive an automated email as soon as our warehouse marks your order ready.
                          </p>
                        </div>
                      </div>
                    )}

                    {order.fulfillmentMethod === 'DELIVERY' && order.deliveryInfo && (
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
                        <div className="flex items-center gap-2 text-sky-700">
                          <Truck className="w-4 h-4" />
                          <h4 className="text-xs font-bold uppercase tracking-wider">Commercial Delivery Address</h4>
                        </div>
                        <p className="text-xs font-bold text-slate-900">
                          {order.deliveryInfo.addressSnapshot.recipientName} {order.deliveryInfo.addressSnapshot.businessName ? `(${order.deliveryInfo.addressSnapshot.businessName})` : ''}
                        </p>
                        <p className="text-xs text-slate-600">
                          {order.deliveryInfo.addressSnapshot.street} {order.deliveryInfo.addressSnapshot.unit ? `· ${order.deliveryInfo.addressSnapshot.unit}` : ''}, {order.deliveryInfo.addressSnapshot.city}, {order.deliveryInfo.addressSnapshot.state} {order.deliveryInfo.addressSnapshot.zip}
                        </p>
                        <div className="pt-2 text-[11px] text-slate-500 space-y-1">
                          <p><strong className="text-slate-700">Phone:</strong> {order.deliveryInfo.addressSnapshot.phone}</p>
                          {order.deliveryInfo.addressSnapshot.deliveryInstructions && (
                            <p><strong className="text-slate-700">Instructions:</strong> {order.deliveryInfo.addressSnapshot.deliveryInstructions}</p>
                          )}
                          <p><strong className="text-slate-700">Delivery Fee:</strong> ${order.deliveryFee.toFixed(2)}</p>
                          <p className="text-sky-700 font-medium mt-1">
                            * You will receive email tracking notifications when out for delivery and when delivered.
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Order Financial Summary */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-xs">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Invoice Breakdown</h4>
                      <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                        <span>Product Subtotal</span>
                        <span className="font-mono text-slate-900 font-bold">${order.subtotal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                        <span>Delivery Fee</span>
                        <span className="font-mono text-slate-900 font-bold">${order.deliveryFee.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-200 text-slate-600">
                        <span>Taxes & Fees</span>
                        <span className="font-mono text-slate-900 font-bold">${order.tax.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between py-1.5 text-sm font-black text-[#FF6B00]">
                        <span>Total</span>
                        <span className="font-mono">${order.total.toFixed(2)}</span>
                      </div>
                      <div className="pt-1 text-[11px] text-slate-500">
                        Payment Status: <span className="font-bold text-slate-900">{order.paymentStatus}</span>
                      </div>
                    </div>
                  </div>

                  {/* Line Items List with Individual Fulfillment Statuses */}
                  <div className="space-y-3">
                    <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Ordered Products ({order.lineItems.length})
                    </h4>
                    <div className="space-y-2">
                      {order.lineItems.map((item) => {
                        const itemHasShortage = ['OUT_OF_STOCK', 'PARTIALLY_AVAILABLE', 'TEMPORARILY_UNAVAILABLE'].includes(item.itemFulfillmentStatus);
                        const isResolving = actionInProgress === `${order.id}-${item.id}`;

                        return (
                          <div
                            key={item.id}
                            className={`p-3.5 rounded-xl border transition-all ${
                              itemHasShortage
                                ? 'bg-amber-50/40 border-amber-300'
                                : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex-1 min-w-[180px]">
                                <h5 className="text-xs font-bold text-slate-900">{item.name}</h5>
                                <p className="text-[10px] text-slate-500 mt-0.5">
                                  SKU: {item.sku} {item.flavor ? `· Flavor: ${item.flavor}` : ''}
                                </p>
                              </div>

                              <div className="flex items-center gap-4 text-xs">
                                <div className="text-right">
                                  <span className="text-slate-500 text-[10px] uppercase block">Ordered</span>
                                  <span className="font-bold text-slate-900">{item.quantityOrdered}</span>
                                </div>

                                <div className="text-right">
                                  <span className="text-slate-500 text-[10px] uppercase block">Available</span>
                                  <span className={`font-bold ${item.physicalQuantityAvailable < item.quantityOrdered ? 'text-amber-600' : 'text-emerald-600'}`}>
                                    {item.physicalQuantityAvailable}
                                  </span>
                                </div>

                                <div className="text-right">
                                  <span className="text-slate-500 text-[10px] uppercase block">Price</span>
                                  <span className="font-mono text-slate-900 font-semibold">${item.pricePerUnit.toFixed(2)}</span>
                                </div>

                                <span
                                  className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    item.itemFulfillmentStatus === 'AVAILABLE' || item.itemFulfillmentStatus === 'FULFILLED'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : item.itemFulfillmentStatus === 'OUT_OF_STOCK'
                                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                      : item.itemFulfillmentStatus === 'PARTIALLY_AVAILABLE'
                                      ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200'
                                  }`}
                                >
                                  {item.itemFulfillmentStatus.replace(/_/g, ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Customer Choice Resolution Options if item has an unresolved shortage */}
                            {itemHasShortage && !item.customerResolutionChoice && (
                              <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                                <p className="text-[11px] text-amber-800 font-medium">
                                  Select an approved option for this product shortage:
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  {item.itemFulfillmentStatus === 'PARTIALLY_AVAILABLE' && (
                                    <button
                                      disabled={isResolving}
                                      onClick={() => handleCustomerResolution(order.id, item.id, 'ACCEPT_PARTIAL')}
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                    >
                                      Accept Available ({item.physicalQuantityAvailable} units)
                                    </button>
                                  )}
                                  <button
                                    disabled={isResolving}
                                    onClick={() => handleCustomerResolution(order.id, item.id, 'REMOVE_ITEM')}
                                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                  >
                                    Remove Product
                                  </button>
                                  <button
                                    disabled={isResolving}
                                    onClick={() => handleCustomerResolution(order.id, item.id, 'WAIT_FOR_PRODUCT')}
                                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 border border-slate-300"
                                  >
                                    Wait for Incoming Restock
                                  </button>
                                  <button
                                    disabled={isResolving}
                                    onClick={() => handleCustomerResolution(order.id, item.id, 'REQUEST_SUBSTITUTE')}
                                    className="px-3 py-1.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                                  >
                                    Request Suitable Substitute
                                  </button>
                                  <a
                                    href="tel:4057682975"
                                    className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 text-xs font-bold rounded-lg border border-slate-300 transition-colors inline-flex items-center gap-1 shadow-xs"
                                  >
                                    <Phone className="w-3 h-3 text-[#FF6B00]" />
                                    <span>Call Warehouse (405) 768-2975</span>
                                  </a>
                                </div>
                              </div>
                            )}

                            {/* Show chosen resolution if already submitted */}
                            {item.customerResolutionChoice && (
                              <div className="mt-2 text-[11px] text-emerald-700 font-semibold flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Resolution applied: {item.customerResolutionChoice.replace(/_/g, ' ')}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineStep({
  active,
  alert,
  label,
  timestamp,
}: {
  active: boolean;
  alert?: boolean;
  label: string;
  timestamp?: string;
}) {
  return (
    <div className="relative z-10 flex flex-col items-center text-center px-1">
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border transition-all ${
          alert
            ? 'bg-amber-500 text-white border-amber-600 animate-pulse'
            : active
            ? 'bg-[#FF6B00] text-white border-[#FF6B00] shadow-xs'
            : 'bg-white text-slate-400 border-slate-300'
        }`}
      >
        {active ? '✓' : '○'}
      </div>
      <span className={`text-[10px] font-bold mt-1.5 ${active ? 'text-slate-900' : 'text-slate-400'}`}>
        {label}
      </span>
      {timestamp && (
        <span className="text-[8px] text-slate-500">
          {new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
    </div>
  );
}
