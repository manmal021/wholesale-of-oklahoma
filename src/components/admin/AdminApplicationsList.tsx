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
  MapPin
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
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'ALL'>('PENDING');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchApplications = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const q = new URLSearchParams();
      if (statusFilter) q.set('status', statusFilter);
      if (search) q.set('search', search);

      const res = await fetch(`/api/admin/applications?${q.toString()}`);
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
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Top Navbar */}
      <nav className="bg-[#15191F] border-b border-[#2A3038] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin"
            className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors"
            title="Back to Admin Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-[#F7F7F5]">
              Customer Account Applications
            </h1>
            <p className="text-[11px] text-[#858C96]">
              Wholesale of Oklahoma • Verification & Access Approval Desk
            </p>
          </div>
        </div>

        <button
          onClick={fetchApplications}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
          title="Refresh applications list"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      {/* Main List Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Filter Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#15191F] border border-[#2A3038] rounded-2xl">
            {(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED', 'ALL'] as const).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? tab === 'PENDING'
                        ? 'bg-amber-500 text-black shadow-md'
                        : tab === 'APPROVED'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : 'bg-[#FF6B00] text-white shadow-md'
                      : 'text-[#858C96] hover:text-[#F7F7F5] hover:bg-[#1B2027]'
                  }`}
                >
                  {tab === 'PENDING' ? 'Pending Review' : tab}
                </button>
              );
            })}
          </div>

          {/* Search Bar */}
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-72">
              <Search className="w-4 h-4 text-[#858C96] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search business, contact, email..."
                className="w-full bg-[#15191F] border border-[#2A3038] rounded-xl pl-9 pr-4 py-2 text-xs text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1B2027] hover:bg-[#2A3038] border border-[#2A3038] text-xs font-bold text-[#F7F7F5] rounded-xl transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Applications Table / Cards */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
            <p className="text-xs text-[#858C96]">Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-[#626871] mx-auto" />
            <h3 className="text-base font-bold text-[#F7F7F5]">No applications found</h3>
            <p className="text-xs text-[#858C96] max-w-sm mx-auto">
              There are currently no customer applications matching the filter "{statusFilter}".
            </p>
          </div>
        ) : (
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl overflow-hidden shadow-xl divide-y divide-[#2A3038]">
            {applications.map((app) => (
              <div
                key={app.id}
                className="p-5 sm:p-6 hover:bg-[#1B2027]/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-base text-[#F7F7F5]">
                      {app.businessName}
                    </span>
                    {app.dba && (
                      <span className="text-xs text-[#858C96]">DBA: {app.dba}</span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        app.status === 'PENDING'
                          ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                          : app.status === 'APPROVED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : app.status === 'SUSPENDED'
                          ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                          : 'bg-red-500/15 border-red-500/40 text-red-400'
                      }`}
                    >
                      {app.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-[#B8BDC5]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#858C96]">Contact:</span>
                      <strong className="text-[#F7F7F5]">{app.contactName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#858C96]" />
                      <span className="truncate">{app.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#858C96]" />
                      <span>{app.phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#858C96]" />
                      <span>
                        {app.address?.city || 'N/A'}, {app.address?.state || 'OK'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[#626871]">
                    <span>ID: <code className="text-[#858C96]">{app.id}</code></span>
                    <span>FEIN: <code className="text-[#858C96]">{app.fein}</code></span>
                    <span>Submitted: {new Date(app.submittedAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                  <a
                    href={`/admin/customer-applications/${app.id}`}
                    className="w-full md:w-auto px-4 py-2.5 rounded-xl bg-[#1B2027] hover:bg-[#FF6B00] text-[#F7F7F5] font-bold text-xs border border-[#2A3038] hover:border-[#FF6B00] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>View Application</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
