import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  ArrowLeft,
  CheckCircle2,
  Ban,
  RefreshCw,
  Loader2,
  Building2,
  Mail,
  Phone,
  MapPin,
  ShieldCheck
} from 'lucide-react';

interface Customer {
  id: string;
  applicationId: string;
  businessName: string;
  dba?: string;
  contactName: string;
  email: string;
  phone: string;
  fein: string;
  licenseNumber?: string;
  businessType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: 'APPROVED' | 'SUSPENDED';
  createdAt: string;
  approvedAt?: string;
  activatedAt?: string;
  suspendedAt?: string;
}

export default function AdminCustomersList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [statusFilter, setStatusFilter] = useState<'APPROVED' | 'SUSPENDED' | 'ALL'>('ALL');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchCustomers = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const q = new URLSearchParams();
      if (statusFilter && statusFilter !== 'ALL') q.set('status', statusFilter);
      if (search) q.set('search', search);

      const res = await fetch(`/api/admin/customers?${q.toString()}`);
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await res.json();
      if (data.customers) {
        setCustomers(data.customers);
      }
    } catch (err: any) {
      setErrorMessage('Failed to load customer directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const handleToggleSuspend = async (cust: Customer) => {
    const isSuspending = cust.status === 'APPROVED';
    const action = isSuspending ? 'suspend' : 'reactivate';
    const confirmMsg = isSuspending
      ? `Are you sure you want to suspend shopping access for ${cust.businessName}?`
      : `Reactivate wholesale shopping access for ${cust.businessName}?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/admin/customers/${cust.id}/${action}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');
      setActionSuccess(`Customer ${cust.businessName} ${isSuspending ? 'suspended' : 'reactivated'}.`);
      fetchCustomers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update customer status.');
    }
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
              Wholesale Customer Directory
            </h1>
            <p className="text-[11px] text-[#858C96]">
              Authorized Commercial B2B Accounts • Active Wholesale Privileges
            </p>
          </div>
        </div>

        <button
          onClick={fetchCustomers}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
          title="Refresh customers"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {errorMessage}
          </div>
        )}

        {/* Filter Controls & Search */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#15191F] border border-[#2A3038] rounded-2xl">
            {(['ALL', 'APPROVED', 'SUSPENDED'] as const).map((tab) => {
              const active = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    active
                      ? tab === 'APPROVED'
                        ? 'bg-emerald-500 text-black shadow-md'
                        : tab === 'SUSPENDED'
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-[#FF6B00] text-white shadow-md'
                      : 'text-[#858C96] hover:text-[#F7F7F5] hover:bg-[#1B2027]'
                  }`}
                >
                  {tab === 'ALL' ? 'All Accounts' : tab}
                </button>
              );
            })}
          </div>

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

        {/* Directory List */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
            <p className="text-xs text-[#858C96]">Loading customer directory...</p>
          </div>
        ) : customers.length === 0 ? (
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-12 text-center space-y-3">
            <Users className="w-10 h-10 text-[#626871] mx-auto" />
            <h3 className="text-base font-bold text-[#F7F7F5]">No customers found</h3>
            <p className="text-xs text-[#858C96]">No wholesale customer accounts matched your search or status filter.</p>
          </div>
        ) : (
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl overflow-hidden shadow-xl divide-y divide-[#2A3038]">
            {customers.map((c) => (
              <div
                key={c.id}
                className="p-5 sm:p-6 hover:bg-[#1B2027]/70 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-extrabold text-base text-[#F7F7F5]">
                      {c.businessName}
                    </span>
                    {c.dba && (
                      <span className="text-xs text-[#858C96]">DBA: {c.dba}</span>
                    )}
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                        c.status === 'APPROVED'
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                          : 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                      }`}
                    >
                      {c.status}
                    </span>
                    {c.activatedAt ? (
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Password Activated
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Activation Pending
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-1.5 text-xs text-[#B8BDC5]">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#858C96]">Contact:</span>
                      <strong className="text-[#F7F7F5]">{c.contactName}</strong>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-[#858C96]" />
                      <span className="truncate">{c.email}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-[#858C96]" />
                      <span>{c.phone}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#858C96]" />
                      <span>
                        {c.address?.city || 'N/A'}, {c.address?.state || 'OK'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-[#626871]">
                    <span>Customer ID: <code className="text-[#858C96]">{c.id}</code></span>
                    <span>FEIN: <code className="text-[#858C96]">{c.fein}</code></span>
                    <span>Permit: <code className="text-[#858C96]">{c.licenseNumber || 'N/A'}</code></span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 w-full md:w-auto justify-end">
                  {c.applicationId && (
                    <a
                      href={`/admin/customer-applications/${c.applicationId}`}
                      className="px-3.5 py-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-xs text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] font-semibold transition-colors"
                    >
                      Application
                    </a>
                  )}

                  <button
                    onClick={() => handleToggleSuspend(c)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      c.status === 'APPROVED'
                        ? 'bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/30'
                        : 'bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white border border-emerald-500/30'
                    }`}
                  >
                    {c.status === 'APPROVED' ? 'Suspend Access' : 'Reactivate Access'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
