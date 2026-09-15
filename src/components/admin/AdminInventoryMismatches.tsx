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
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Header */}
      <header className="bg-[#15191F] border-b border-[#2A3038] px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
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
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-[#F7F7F5]">
                  Physical Inventory Discrepancy Log
                </h1>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                  Warehouse Reconciliation
                </span>
              </div>
              <p className="text-xs text-[#858C96]">
                Identifies physical warehouse mismatches vs Zoho live counts reported during fulfillment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadMismatches}
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
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
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="flex items-center justify-between gap-3 bg-[#15191F] p-4 rounded-2xl border border-[#2A3038]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#858C96] uppercase tracking-wider mr-1">Filter:</span>
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
                    ? 'bg-[#FF6B00] text-white shadow-sm'
                    : 'bg-[#1B2027] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <span className="text-xs font-mono text-[#858C96]">
            {mismatches.length} record{mismatches.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Mismatches Table */}
        <div className="bg-[#15191F] rounded-2xl border border-[#2A3038] overflow-hidden shadow-xl">
          {isLoading ? (
            <div className="py-16 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-[#858C96]">Loading mismatch records...</p>
            </div>
          ) : mismatches.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h3 className="text-sm font-bold text-[#F7F7F5]">No Inventory Discrepancies Found</h3>
              <p className="text-xs text-[#858C96]">
                Physical stock verification counts currently match or no records match your filter.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#2A3038] bg-[#1B2027]/70 text-[#858C96] text-[10px] font-black uppercase tracking-wider">
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
                <tbody className="divide-y divide-[#2A3038]">
                  {mismatches.map((m) => (
                    <tr key={m.id} className="hover:bg-[#1B2027] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#F7F7F5]">{m.productName}</div>
                        <div className="text-[10px] text-[#858C96] font-mono">SKU: {m.sku}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[#FF6B00]">
                        <a href={`/admin/orders/${m.orderId}`} className="hover:underline">
                          {m.orderId}
                        </a>
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-[#B8BDC5]">
                        {m.systemQuantity}
                      </td>

                      <td className="py-3.5 px-4 text-center font-mono font-bold text-amber-400">
                        {m.physicalQuantity}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-bold px-2 py-0.5 rounded ${
                            m.difference < 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                          }`}
                        >
                          {m.difference > 0 ? `+${m.difference}` : m.difference}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#858C96]">
                        <div className="text-[#F7F7F5] font-semibold">{m.reportedBy}</div>
                        <div className="text-[10px]">{new Date(m.reportedAt).toLocaleString()}</div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            m.resolved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {m.resolved ? 'Resolved' : 'Shortage Unresolved'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {!m.resolved ? (
                          <button
                            onClick={() => setResolvingId(m.id)}
                            className="px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs rounded-lg border border-amber-500/40 transition-colors cursor-pointer"
                          >
                            Mark Resolved
                          </button>
                        ) : (
                          <span className="text-[10px] text-[#858C96] italic">
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
          <div className="fixed inset-0 z-50 bg-[#0B0D10]/80 backdrop-blur-sm flex items-center justify-center p-4">
            <form
              onSubmit={handleResolve}
              className="bg-[#15191F] border border-[#2A3038] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl"
            >
              <h3 className="text-sm font-bold text-[#F7F7F5] uppercase tracking-wider">
                Resolve Inventory Discrepancy
              </h3>
              <p className="text-xs text-[#858C96]">
                Record reconciliation action (e.g. Zoho inventory adjusted, replacement shipment unpacked, or count verified).
              </p>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-[#B8BDC5] block mb-1">
                  Reconciliation Notes
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolveNotes}
                  onChange={(e) => setResolveNotes(e.target.value)}
                  placeholder="e.g. Zoho count reconciled down to physical quantity."
                  className="w-full bg-[#0B0D10] border border-[#2A3038] rounded-xl p-3 text-xs text-[#F7F7F5] focus:border-[#FF6B00] outline-none"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setResolvingId(null)}
                  className="px-4 py-2 bg-[#1B2027] text-xs font-bold text-[#858C96] rounded-xl hover:bg-[#2A3038] transition-colors cursor-pointer"
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
