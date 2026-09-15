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
  Package
} from 'lucide-react';

interface Stats {
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
  totalApplications: number;
  totalCustomers: number;
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
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Top Admin Navbar */}
      <nav className="bg-[#15191F] border-b border-[#2A3038] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white shadow-md">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-[#F7F7F5]">WHOLESALE OF OKLAHOMA</span>
              <span className="bg-[#FF6B00]/15 border border-[#FF6B00]/30 text-[#FF6B00] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Admin Portal</span>
            </div>
            <p className="text-[11px] text-[#858C96]">order2wholesaleofoklahoma@gmail.com</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-[#858C96] hover:text-[#F7F7F5] px-3 py-1.5 rounded-lg border border-[#2A3038] hover:bg-[#1B2027] transition-colors"
          >
            <span>Live Site</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-lg border border-rose-500/20 hover:bg-rose-500/10 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      {/* Main Admin Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-[#2A3038] pb-4">
          <a
            href="/admin"
            className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-sm"
          >
            Dashboard
          </a>
          <a
            href="/admin/customer-applications"
            className="px-4 py-2 rounded-xl bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
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
            className="px-4 py-2 rounded-xl bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors"
          >
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            Wholesale Customers
          </a>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Highlight Callout: Pending Review Action */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-500/10 via-[#15191F] to-[#15191F] border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400 bg-amber-500/15 px-3 py-1 rounded-full border border-amber-500/30">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Action Required</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F7F7F5]">
              {stats.pending} Customer {stats.pending === 1 ? 'Application' : 'Applications'} Pending Review
            </h2>
            <p className="text-xs sm:text-sm text-[#B8BDC5] max-w-xl">
              New wholesale accounts are placed in PENDING status. Review business licenses and FEIN tax identification to grant shopping privileges.
            </p>
          </div>

          <a
            href="/admin/customer-applications"
            className="px-6 py-3.5 rounded-2xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-[#FF6B00]/25 transition-all hover:scale-105 shrink-0"
          >
            <span>Review Pending Applications</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Counter Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Pending */}
          <div className="p-5 rounded-2xl bg-[#15191F] border border-amber-500/30 space-y-2 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">Pending Review</span>
              <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-[#F7F7F5]">{stats.pending}</div>
            <p className="text-[11px] text-[#858C96]">Applicants awaiting verification</p>
          </div>

          {/* Approved */}
          <div className="p-5 rounded-2xl bg-[#15191F] border border-emerald-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">Approved Accounts</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-emerald-400">{stats.approved}</div>
            <p className="text-[11px] text-[#858C96]">Active wholesale purchasing access</p>
          </div>

          {/* Rejected */}
          <div className="p-5 rounded-2xl bg-[#15191F] border border-red-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">Rejected</span>
              <div className="w-8 h-8 rounded-lg bg-red-500/15 flex items-center justify-center text-red-400">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-red-400">{stats.rejected}</div>
            <p className="text-[11px] text-[#858C96]">Declined wholesale applications</p>
          </div>

          {/* Suspended */}
          <div className="p-5 rounded-2xl bg-[#15191F] border border-purple-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">Suspended</span>
              <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400">
                <Ban className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-400">{stats.suspended}</div>
            <p className="text-[11px] text-[#858C96]">Accounts with revoked access</p>
          </div>
        </div>

        {/* Recent Audit Activity */}
        <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#F7F7F5] flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#FF6B00]" />
                Recent Compliance Audit Trail
              </h3>
              <p className="text-xs text-[#858C96]">Cryptographically logged administrative and applicant actions</p>
            </div>
            <button
              onClick={fetchDashboardData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
              title="Refresh audit logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {logs.length === 0 ? (
            <div className="text-center py-8 text-xs text-[#858C96]">No recent audit logs recorded.</div>
          ) : (
            <div className="divide-y divide-[#2A3038] overflow-hidden">
              {logs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#F7F7F5]">{log.event.replace(/_/g, ' ')}</span>
                      {log.targetEmail && (
                        <span className="text-[#858C96]">({log.targetEmail})</span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#626871]">
                      Logged: {new Date(log.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <span className="bg-[#1B2027] text-[#858C96] font-mono text-[10px] px-2 py-0.5 rounded border border-[#2A3038]">
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
