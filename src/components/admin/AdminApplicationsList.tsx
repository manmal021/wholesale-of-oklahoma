import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  ChevronRight,
  Filter,
  Loader2,
  RefreshCw,
  Building2,
  Mail,
  Phone,
  MapPin,
  Key,
  Copy,
  Check,
  X,
  Send
} from 'lucide-react';

interface Application {
  id: string;
  businessName: string;
  dba?: string;
  contactName: string;
  email: string;
  phone: string;
  fein: string;
  businessType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  submittedAt: string;
}

export default function AdminApplicationsList() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL'>(() => {
    if (typeof window !== 'undefined') {
      const param = new URLSearchParams(window.location.search).get('status')?.toUpperCase();
      if (param === 'PENDING' || param === 'APPROVED' || param === 'REJECTED' || param === 'SUSPENDED' || param === 'ALL') {
        return param;
      }
    }
    return 'PENDING';
  });
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [processingAppId, setProcessingAppId] = useState<string | null>(null);
  const [approvedModalCredentials, setApprovedModalCredentials] = useState<{
    businessName: string;
    username: string;
    password: string;
    loginUrl?: string;
    welcomeMessage?: string;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      // ignore
    }
  };

  const handleQuickApprove = async (app: Application) => {
    setProcessingAppId(app.id);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${app.id}/approve`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to approve application.');
      }
      setActionSuccess(`Application for "${app.businessName}" (${app.email}) has been APPROVED.`);
      if (data.credentials) {
        setApprovedModalCredentials({
          businessName: app.businessName,
          username: data.credentials.username,
          password: data.credentials.password,
          loginUrl: data.credentials.loginUrl,
          welcomeMessage: data.credentials.welcomeMessage,
        });
      }
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'APPROVED' } : a))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const handleQuickDeny = async (app: Application) => {
    const reason = window.prompt(`Enter reason for declining application for "${app.businessName}" (optional):`, 'Application declined by compliance review');
    if (reason === null) return; // User cancelled prompt

    setProcessingAppId(app.id);
    setErrorMessage(null);
    setActionSuccess(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${app.id}/reject`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to decline application.');
      }
      setActionSuccess(`Application for "${app.businessName}" (${app.email}) has been DECLINED.`);
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'REJECTED' } : a))
      );
    } catch (err: any) {
      setErrorMessage(err.message || 'Rejection failed.');
    } finally {
      setProcessingAppId(null);
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const authHeader: Record<string, string> = token ? { 'x-session-token': token } : {};

      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (search) q.set('search', search);

      const res = await fetch(`/api/admin/applications?${q.toString()}`, {
        headers: authHeader,
        credentials: 'same-origin',
      });
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await res.json();
      if (data.applications) {
        setApplications(data.applications);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load applications.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchApplications();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <a
            href="/admin"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
              Customer Account Applications
            </h1>
            <p className="text-[11px] text-slate-500">
              Wholesale of Oklahoma • Verification & Access Approval Desk
            </p>
          </div>
        </div>

        <button
          onClick={fetchApplications}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
          title="Refresh applications list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      {/* Main List Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 shadow-xs">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5 shadow-xs">
            <XCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-white border border-slate-200 rounded-2xl shadow-xs">
            {(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL'] as const).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? tab === 'APPROVED'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : tab === 'REJECTED'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : tab === 'SUSPENDED'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-[#FF6B00] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'ALL' ? 'All Applications' : tab}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, contact, email..."
                className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-xs font-bold text-slate-700 rounded-xl transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Applications Table / Cards */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
            <p className="text-xs text-slate-500">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No applications found</h3>
            <p className="text-xs text-slate-500">
              There are currently no customer applications matching the filter "{statusFilter}".
            </p>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs divide-y divide-slate-200">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-5 sm:p-6 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-base text-slate-900">
                      {app.businessName}
                    </span>
                    {app.dba && (
                      <span className="text-xs text-slate-500">DBA: {app.dba}</span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        app.status === 'PENDING'
                          ? 'bg-amber-50 border-amber-200 text-amber-700'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          : app.status === 'SUSPENDED'
                          ? 'bg-purple-50 border-purple-200 text-purple-700'
                          : 'bg-rose-50 border-rose-200 text-rose-700'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-400">Contact:</span>
                      <strong className="text-slate-900">{app.contactName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span className="truncate">{app.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>{app.phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {app.address?.city || 'N/A'}, {app.address?.state || 'OK'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400">
                    <span>ID: <code className="text-slate-600">{app.id}</code></span>
                    <span>FEIN: <code className="text-slate-600">{app.fein}</code></span>
                    <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
                  {/* Quick Approve / Deny Actions */}
                  {app.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleQuickDeny(app)}
                        disabled={processingAppId === app.id}
                        className="px-3 py-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="Deny / Reject Application"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Deny</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickApprove(app)}
                        disabled={processingAppId === app.id}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                        title="Approve Account & Dispatch Activation"
                      >
                        {processingAppId === app.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        <span>Approve</span>
                      </button>
                    </>
                  )}

                  {app.status === 'REJECTED' && (
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(app)}
                      disabled={processingAppId === app.id}
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
                      title="Re-Approve Account"
                    >
                      {processingAppId === app.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      <span>Approve</span>
                    </button>
                  )}

                  <a
                    href={`/admin/customer-applications/${app.id}`}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-[#FF6B00] text-slate-800 hover:text-white font-bold text-xs border border-slate-200 hover:border-[#FF6B00] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK APPROVE CREDENTIALS MODAL */}
      {approvedModalCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setApprovedModalCredentials(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Account Approved!</h3>
                <p className="text-xs text-slate-400">
                  Credentials generated for {approvedModalCredentials.businessName}
                </p>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 space-y-1">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Customer Can Now Sign In & Shop
              </div>
              <p className="text-slate-300">
                You can manually copy these credentials or copy the welcome message to send directly to the customer.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username (Email)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-white font-medium select-all">{approvedModalCredentials.username}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(approvedModalCredentials.username, 'modal_email')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy Username"
                  >
                    {copiedKey === 'modal_email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned 10-Digit Password (Upper, Lower, Number, Symbol)
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-base font-bold tracking-wider text-emerald-400 select-all">
                    {approvedModalCredentials.password}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(approvedModalCredentials.password, 'modal_password')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    title="Copy Password"
                  >
                    {copiedKey === 'modal_password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  const msg = approvedModalCredentials.welcomeMessage ||
                    `Hello ${approvedModalCredentials.businessName},\n\nYour Wholesale of Oklahoma account has been approved!\n\nYou can now log in at https://www.wholesaleofoklahoma.com with:\nUsername: ${approvedModalCredentials.username}\nPassword: ${approvedModalCredentials.password}\n\nOnce logged in, wholesale pricing and ordering will be unlocked.\n\nThank you,\nWholesale of Oklahoma`;
                  handleCopy(msg, 'modal_msg');
                }}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-medium text-xs flex items-center justify-center gap-2 cursor-pointer border border-white/15 transition-colors"
              >
                {copiedKey === 'modal_msg' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedKey === 'modal_msg' ? 'Message Copied!' : 'Copy Welcome Message'}
              </button>

              <button
                type="button"
                onClick={() => setApprovedModalCredentials(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
