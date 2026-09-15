import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ArrowRight,
  LogOut,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Package,
  Truck,
  Layers,
  AlertTriangle,
} from 'lucide-react';

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  totalApplications: number;
  totalCustomers: number;
  totalOrders?: number;
  newOrders?: number;
  pendingOrders?: number;
  pickupOrders?: number;
  deliveryOrders?: number;
  inventoryIssues?: number;
  activeOverrides?: number;
}

interface AuditLog {
  id: string;
  event: string;
  targetEmail?: string;
  adminEmail?: string;
  timestamp: string;
  details?: Record<string, any>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
    totalApplications: 0,
    totalCustomers: 0,
    totalOrders: 0,
    newOrders: 0,
    pendingOrders: 0,
    pickupOrders: 0,
    deliveryOrders: 0,
    inventoryIssues: 0,
    activeOverrides: 0,
  });
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [statsRes, logsRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/audit-logs'),
      ]);

      if (statsRes.status === 401 || statsRes.status === 403) {
        window.location.href = '/admin/login';
        return;
      }

      const statsData = await statsRes.json();
      if (statsData.stats) {
        setStats(statsData.stats);
      }

      const logsData = await logsRes.json();
      if (logsData.logs) {
        setLogs(logsData.logs.slice(0, 10));
      }
    } catch (err: any) {
      setErrorMessage('Failed to connect to administrative server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    try {
      localStorage.removeItem('woo_session_token');
      localStorage.removeItem('woo_user');
    } catch (_) {}
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Admin Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white shadow-xs">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">WHOLESALE OF OKLAHOMA</span>
              <span className="bg-orange-50 border border-orange-200 text-[#FF6B00] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Admin Portal</span>
            </div>
            <p className="text-[11px] text-slate-500">order2wholesaleofoklahoma@gmail.com</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <a
            href="/admin"
            className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs"
          >
            Dashboard
          </a>
          <a
            href="/admin/customer-applications"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#FF6B00]" />
            Customer Applications
            {stats.pending > 0 && (
              <span className="bg-[#FF6B00] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.pending}
              </span>
            )}
          </a>
          <a
            href="/admin/customers"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Wholesale Customers
          </a>
          <a
            href="/admin/orders"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Wholesale Orders
            {(stats.newOrders || 0) > 0 && (
              <span className="bg-[#FF6B00] text-white text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.newOrders}
              </span>
            )}
          </a>
          <a
            href="/admin/products"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            Products / Availability
            {(stats.activeOverrides || 0) > 0 && (
              <span className="bg-rose-100 text-rose-700 border border-rose-200 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {stats.activeOverrides}
              </span>
            )}
          </a>
          <a
            href="/admin/inventory-mismatches"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            Inventory Mismatches
          </a>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Highlight Callout: Pending Review Action */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-50 via-white to-white border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-full border border-amber-200">
              <Clock className="w-3.5 h-3.5 text-amber-700" />
              <span>Pending Action Required</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              {stats.pending} Customer {stats.pending === 1 ? 'Application' : 'Applications'} Pending Review
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl">
              New wholesale accounts are placed in PENDING status. Review business licenses and FEIN tax identification to grant shopping privileges.
            </p>
          </div>

          <a
            href="/admin/customer-applications"
            className="px-6 py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-105 shrink-0"
          >
            <span>Review Pending Applications</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Counter Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Pending */}
          <div className="p-5 rounded-2xl bg-white border border-amber-200 space-y-2 relative overflow-hidden shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-slate-900">{stats.pending}</div>
            <p className="text-[11px] text-slate-500">Applicants awaiting verification</p>
          </div>

          {/* Approved */}
          <div className="p-5 rounded-2xl bg-white border border-emerald-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Approved Accounts</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-600">{stats.approved}</div>
            <p className="text-[11px] text-slate-500">Active wholesale purchasing access</p>
          </div>

          {/* Rejected */}
          <div className="p-5 rounded-2xl bg-white border border-rose-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Rejected</span>
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 border border-rose-200">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-rose-600">{stats.rejected}</div>
            <p className="text-[11px] text-slate-500">Declined wholesale applications</p>
          </div>

          {/* Suspended */}
          <div className="p-5 rounded-2xl bg-white border border-purple-200 space-y-2 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Suspended</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 border border-purple-200">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-600">{stats.suspended}</div>
            <p className="text-[11px] text-slate-500">Accounts with revoked access</p>
          </div>
        </div>

        {/* Operational Warehouse & Order Fulfillment Row */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Fulfillment & Dispatch Operations</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* New Orders */}
            <a
              href="/admin/orders?status=ORDER_RECEIVED"
              className="p-4 rounded-2xl bg-white border border-orange-200 hover:border-[#FF6B00] transition-colors space-y-1.5 shadow-xs block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">New Orders</span>
                <span className="w-6 h-6 rounded-lg bg-orange-50 text-[#FF6B00] flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-slate-900">{stats.newOrders || 0}</div>
              <p className="text-[10px] text-slate-500">Awaiting dispatch triage</p>
            </a>

            {/* Pickup Orders */}
            <a
              href="/admin/orders?fulfillment=PICKUP"
              className="p-4 rounded-2xl bg-white border border-sky-200 hover:border-sky-400 transition-colors space-y-1.5 shadow-xs block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pickup Orders</span>
                <span className="w-6 h-6 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-sky-700">{stats.pickupOrders || 0}</div>
              <p className="text-[10px] text-slate-500">OKC Central Warehouse</p>
            </a>

            {/* Delivery Orders */}
            <a
              href="/admin/orders?fulfillment=DELIVERY"
              className="p-4 rounded-2xl bg-white border border-indigo-200 hover:border-indigo-400 transition-colors space-y-1.5 shadow-xs block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Delivery Orders</span>
                <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Truck className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-indigo-700">{stats.deliveryOrders || 0}</div>
              <p className="text-[10px] text-slate-500">Commercial Metro Route</p>
            </a>

            {/* Shortages / Exceptions */}
            <a
              href="/admin/orders?status=INVENTORY_ISSUE"
              className="p-4 rounded-2xl bg-white border border-rose-200 hover:border-rose-400 transition-colors space-y-1.5 shadow-xs block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Exceptions</span>
                <span className="w-6 h-6 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-rose-700">{stats.inventoryIssues || 0}</div>
              <p className="text-[10px] text-slate-500">Action required</p>
            </a>

            {/* Overridden Products */}
            <a
              href="/admin/products"
              className="p-4 rounded-2xl bg-white border border-amber-200 hover:border-amber-400 transition-colors space-y-1.5 shadow-xs block"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unavailable</span>
                <span className="w-6 h-6 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Ban className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-2xl font-black text-amber-700">{stats.activeOverrides || 0}</div>
              <p className="text-[10px] text-slate-500">Manual stock overrides</p>
            </a>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF6B00]" />
                Recent Compliance Audit Trail
              </h3>
              <p className="text-xs text-slate-500">Cryptographically logged administrative and applicant actions</p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">No recent audit logs recorded.</div>
          ) : (
            <div className="divide-y divide-slate-200 overflow-hidden">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{log.event.replace(/_/g, ' ')}</span>
                      {log.targetEmail && (
                        <span className="text-slate-500">({log.targetEmail})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Logged: {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-0.5 rounded border border-slate-200">
                    {log.id}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
