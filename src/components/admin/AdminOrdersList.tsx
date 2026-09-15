import React, { useState, useEffect } from 'react';
import {
  Package,
  MapPin,
  Truck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import {
  fetchAdminOrders,
  type OrderRecord,
  type FulfillmentMethod,
  type GeneralOrderStatus,
} from '../../lib/fulfillmentApi';

export default function AdminOrdersList() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [fulfillmentFilter, setFulfillmentFilter] = useState<'ALL' | 'PICKUP' | 'DELIVERY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const loadOrders = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchAdminOrders({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        fulfillmentMethod: fulfillmentFilter !== 'ALL' ? fulfillmentFilter : undefined,
        search: searchTerm || undefined,
      });
      setOrders(data.orders);
    } catch (err: any) {
      setError(err.message || 'Failed to load orders.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [fulfillmentFilter, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadOrders();
  };

  // Compute stat counters
  const pickupCount = orders.filter((o) => o.fulfillmentMethod === 'PICKUP').length;
  const deliveryCount = orders.filter((o) => o.fulfillmentMethod === 'DELIVERY').length;
  const issueCount = orders.filter((o) => o.hasInventoryIssue || o.status === 'INVENTORY_ISSUE' || o.status === 'CUSTOMER_ACTION_REQUIRED').length;
  const readyPickupCount = orders.filter((o) => o.status === 'READY_FOR_PICKUP').length;
  const outDeliveryCount = orders.filter((o) => o.status === 'OUT_FOR_DELIVERY').length;

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Top Admin Bar */}
      <header className="bg-[#15191F] border-b border-[#2A3038] px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin"
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-[#F7F7F5]">
                  Wholesale Order Fulfillment
                </h1>
                <span className="bg-[#FF6B00]/20 text-[#FF6B00] border border-[#FF6B00]/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Admin Dispatch Portal
                </span>
              </div>
              <p className="text-xs text-[#858C96]">Warehouse order preparation, physical checks & dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <a
              href="/admin/inventory-mismatches"
              className="px-3.5 py-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] font-bold text-xs border border-[#2A3038] transition-colors flex items-center gap-1.5"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Inventory Mismatches</span>
            </a>
            <button
              onClick={loadOrders}
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
              title="Refresh Queue"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div
            onClick={() => { setFulfillmentFilter('ALL'); setStatusFilter('ALL'); }}
            className="bg-[#15191F] p-4 rounded-2xl border border-[#2A3038] hover:border-[#FF6B00] transition-colors cursor-pointer"
          >
            <span className="text-[10px] font-bold text-[#858C96] uppercase tracking-wider block">Total Orders</span>
            <span className="text-xl font-black text-[#F7F7F5] font-mono mt-1 block">{orders.length}</span>
          </div>

          <div
            onClick={() => { setFulfillmentFilter('PICKUP'); }}
            className={`p-4 rounded-2xl border transition-colors cursor-pointer ${
              fulfillmentFilter === 'PICKUP' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-[#15191F] border-[#2A3038]'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Pickup Orders
            </span>
            <span className="text-xl font-black text-[#F7F7F5] font-mono mt-1 block">{pickupCount}</span>
          </div>

          <div
            onClick={() => { setFulfillmentFilter('DELIVERY'); }}
            className={`p-4 rounded-2xl border transition-colors cursor-pointer ${
              fulfillmentFilter === 'DELIVERY' ? 'bg-sky-500/10 border-sky-500/50' : 'bg-[#15191F] border-[#2A3038]'
            }`}
          >
            <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1">
              <Truck className="w-3 h-3" /> Delivery Orders
            </span>
            <span className="text-xl font-black text-[#F7F7F5] font-mono mt-1 block">{deliveryCount}</span>
          </div>

          <div
            onClick={() => { setStatusFilter('INVENTORY_ISSUE'); }}
            className={`p-4 rounded-2xl border transition-colors cursor-pointer ${
              statusFilter === 'INVENTORY_ISSUE' ? 'bg-amber-500/20 border-amber-500' : 'bg-[#15191F] border-[#2A3038]'
            }`}
          >
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Issues / Action Req.
            </span>
            <span className="text-xl font-black text-amber-400 font-mono mt-1 block">{issueCount}</span>
          </div>

          <div
            onClick={() => { setStatusFilter('READY_FOR_PICKUP'); }}
            className={`p-4 rounded-2xl border transition-colors cursor-pointer ${
              statusFilter === 'READY_FOR_PICKUP' ? 'bg-emerald-500/20 border-emerald-500' : 'bg-[#15191F] border-[#2A3038]'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Ready For Pickup
            </span>
            <span className="text-xl font-black text-emerald-400 font-mono mt-1 block">{readyPickupCount}</span>
          </div>
        </div>

        {/* Filter Controls & Search */}
        <div className="bg-[#15191F] p-4 rounded-2xl border border-[#2A3038] space-y-3">
          {/* Method Filters */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-[#858C96] uppercase tracking-wider mr-1">Method:</span>
              {(['ALL', 'PICKUP', 'DELIVERY'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setFulfillmentFilter(m)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    fulfillmentFilter === m
                      ? 'bg-[#FF6B00] text-white shadow-sm'
                      : 'bg-[#1B2027] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038]'
                  }`}
                >
                  {m === 'ALL' ? 'All Methods' : m}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#858C96]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Order #, name, phone, email..."
                  className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00]"
                />
              </div>
              <button
                type="submit"
                className="px-3.5 py-1.5 bg-[#1B2027] hover:bg-[#2A3038] text-[#F7F7F5] text-xs font-bold rounded-xl border border-[#2A3038] transition-colors cursor-pointer"
              >
                Search
              </button>
            </form>
          </div>

          {/* Status Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#2A3038]/60">
            <span className="text-xs font-bold text-[#858C96] uppercase tracking-wider mr-1">Status:</span>
            {[
              { id: 'ALL', label: 'All Statuses' },
              { id: 'ORDER_RECEIVED', label: 'Order Received' },
              { id: 'PROCESSING', label: 'Processing' },
              { id: 'INVENTORY_ISSUE', label: 'Inventory Issue' },
              { id: 'CUSTOMER_ACTION_REQUIRED', label: 'Action Required' },
              { id: 'READY_FOR_PICKUP', label: 'Ready for Pickup' },
              { id: 'OUT_FOR_DELIVERY', label: 'Out for Delivery' },
              { id: 'COMPLETED', label: 'Completed' },
              { id: 'CANCELLED', label: 'Cancelled' },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStatusFilter(s.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  statusFilter === s.id
                    ? 'bg-[#F7F7F5] text-black shadow-xs'
                    : 'bg-[#1B2027] text-[#858C96] hover:text-[#B8BDC5] border border-[#2A3038]'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Orders Table */}
        <div className="bg-[#15191F] rounded-2xl border border-[#2A3038] overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-[#858C96]">Loading orders queue...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Package className="w-10 h-10 text-[#858C96] mx-auto" />
              <h3 className="text-sm font-bold text-[#F7F7F5]">No Orders Found</h3>
              <p className="text-xs text-[#858C96]">No matching orders found for the selected filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A3038] bg-[#1B2027]/70 text-[#858C96] text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4">Order #</th>
                    <th className="py-3.5 px-4">Customer / Entity</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Method</th>
                    <th className="py-3.5 px-4">Items</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Payment</th>
                    <th className="py-3.5 px-4 text-right">Total</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A3038]">
                  {orders.map((ord) => {
                    const hasIssue = ord.hasInventoryIssue || ord.status === 'INVENTORY_ISSUE' || ord.status === 'CUSTOMER_ACTION_REQUIRED';

                    return (
                      <tr
                        key={ord.id}
                        className={`hover:bg-[#1B2027] transition-colors ${
                          hasIssue ? 'bg-amber-500/[0.03]' : ''
                        }`}
                      >
                        <td className="py-3.5 px-4">
                          <a
                            href={`/admin/orders/${ord.id}`}
                            className="font-mono font-black text-sm text-[#FF6B00] hover:underline"
                          >
                            #{ord.orderNumber}
                          </a>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#F7F7F5] truncate max-w-[180px]">
                            {ord.customerName}
                          </div>
                          {ord.businessName && (
                            <div className="text-[11px] text-[#858C96] truncate max-w-[180px]">
                              {ord.businessName}
                            </div>
                          )}
                          <div className="text-[10px] text-[#858C96] font-mono">{ord.phone}</div>
                        </td>

                        <td className="py-3.5 px-4 text-[#858C96] whitespace-nowrap">
                          {new Date(ord.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          <div className="text-[10px]">
                            {new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              ord.fulfillmentMethod === 'PICKUP'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {ord.fulfillmentMethod === 'PICKUP' ? (
                              <MapPin className="w-2.5 h-2.5" />
                            ) : (
                              <Truck className="w-2.5 h-2.5" />
                            )}
                            {ord.fulfillmentMethod}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[#B8BDC5]">
                          {ord.lineItems?.length || 0}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                              ord.status === 'READY_FOR_PICKUP'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : ord.status === 'OUT_FOR_DELIVERY'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : ord.status === 'COMPLETED' || ord.status === 'DELIVERED' || ord.status === 'PICKED_UP'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : hasIssue
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : ord.status === 'PROCESSING'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-[#0B0D10] text-[#858C96] border border-[#2A3038]'
                            }`}
                          >
                            {hasIssue && <AlertTriangle className="w-3 h-3 text-amber-400" />}
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-semibold text-[#858C96] text-[11px]">
                          {ord.paymentStatus}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold text-[#F7F7F5] whitespace-nowrap">
                          ${ord.total.toFixed(2)}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <a
                            href={`/admin/orders/${ord.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
                          >
                            <span>Prepare</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
