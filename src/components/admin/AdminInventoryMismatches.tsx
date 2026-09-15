import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Search,
  RefreshCw,
  Loader2,
  Package,
  Layers,
  Check,
} from 'lucide-react';
import {
  fetchAdminInventoryMismatches,
  resolveAdminInventoryMismatch,
  type InventoryMismatchRecord,
} from '../../lib/fulfillmentApi';

export default function AdminInventoryMismatches() {
  const [mismatches, setMismatches] = useState<InventoryMismatchRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filterResolved, setFilterResolved] = useState<boolean | undefined>(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadMismatches = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await fetchAdminInventoryMismatches(filterResolved);
      setMismatches(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load inventory discrepancies.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMismatches();
  }, [filterResolved]);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingId) return;

    setIsSubmitting(true);
    setError('');
    try {
      await resolveAdminInventoryMismatch(resolvingId, resolveNotes.trim() || 'Physical inventory corrected.');
      setSuccess(`Discrepancy record ${resolvingId} marked resolved.`);
      setResolvingId(null);
      setResolveNotes('');
      await loadMismatches();
    } catch (err: any) {
      setError(err.message || 'Failed to resolve mismatch record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a
              href="/admin/orders"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
              title="Back to Orders Queue"
            >
              <ArrowLeft className="w-4 h-4" />
            </a>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  Physical Inventory Discrepancy Log
                </h1>
                <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Warehouse Reconciliation
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Identifies physical warehouse mismatches vs Zoho live counts reported during fulfillment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadMismatches}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Messages */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">Filter:</span>
            {[
              { id: false, label: 'Unresolved Shortages' },
              { id: true, label: 'Resolved History' },
              { id: undefined, label: 'All Records' },
            ].map((f) => (
              <button
                key={String(f.id)}
                onClick={() => setFilterResolved(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  filterResolved === f.id
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-slate-500">
            {mismatches.length} record{mismatches.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Mismatches Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-slate-500">Loading mismatch records...</p>
            </div>
          ) : mismatches.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-900">No Inventory Discrepancies Found</h3>
              <p className="text-xs text-slate-500">
                Physical stock verification counts currently match or no records match your filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3.5 px-4">Product Name & SKU</th>
                    <th className="py-3.5 px-4">Order ID</th>
                    <th className="py-3.5 px-4 text-center">System Qty</th>
                    <th className="py-3.5 px-4 text-center">Physical Qty</th>
                    <th className="py-3.5 px-4 text-center">Discrepancy</th>
                    <th className="py-3.5 px-4">Reported By & Date</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {mismatches.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{m.productName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">SKU: {m.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#FF6B00]">
                        <a href={`/admin/orders/${m.orderId}`} className="hover:underline">
                          {m.orderId}
                        </a>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-700">
                        {m.systemQuantity}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-600">
                        {m.physicalQuantity}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            m.difference < 0 ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {m.difference > 0 ? `+${m.difference}` : m.difference}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-slate-500">
                        <div className="text-slate-900 font-semibold">{m.reportedBy}</div>
                        <div className="text-[10px]">{new Date(m.reportedAt).toLocaleString()}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            m.resolved
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {m.resolved ? 'Resolved' : 'Shortage Unresolved'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!m.resolved ? (
                          <button
                            onClick={() => setResolvingId(m.id)}
                            className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold text-xs rounded-lg border border-amber-200 transition-colors cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            {m.resolutionNotes || 'Resolved'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Resolve Modal */}
        {resolvingId && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <form
              onSubmit={handleResolve}
              className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl"
            >
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Resolve Inventory Discrepancy
              </h3>
              <p className="text-xs text-slate-500">
                Record reconciliation action (e.g. Zoho inventory adjusted, replacement shipment unpacked, or count verified).
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Reconciliation Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Zoho count reconciled down to physical quantity."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#FF6B00] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  className="px-4 py-2 bg-slate-100 text-xs font-bold text-slate-700 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  <span>Confirm Resolved</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
