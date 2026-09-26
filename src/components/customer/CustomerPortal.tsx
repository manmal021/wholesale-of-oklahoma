/**
 * CustomerPortal.tsx
 *
 * Secure portal exclusively for approved wholesale customers.
 * Shows account details, credentials reminder, order history, and business profile.
 * Redirects unauthenticated / non-approved users to the homepage.
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  LogOut,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Key,
  ChevronRight,
  FileText,
  Clock,
  Star,
  ArrowRight,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  role: string;
  businessName?: string;
  contactName?: string;
  has_pricing_access?: boolean;
}

interface CustomerProfile {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  status: string;
  approvedAt?: string;
  createdAt: string;
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
  return token ? { 'x-session-token': token, Authorization: `Bearer ${token}` } : {};
}

function StatCard({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 border ${accent ? 'bg-gradient-to-br from-[#FF6B00]/10 to-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
      <div className="flex items-center gap-3 mb-1">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accent ? 'bg-[#FF6B00]/15' : 'bg-slate-100'}`}>
          <Icon className={`w-4 h-4 ${accent ? 'text-[#FF6B00]' : 'text-slate-500'}`} />
        </div>
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className={`text-lg font-bold mt-2 ${accent ? 'text-[#FF6B00]' : 'text-slate-900'}`}>{value}</p>
    </div>
  );
}

export default function CustomerPortal() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'profile' | 'orders'>('overview');

  useEffect(() => {
    const init = async () => {
      try {
        const headers = getAuthHeaders();
        const res = await fetch('/api/auth/me', { headers, credentials: 'include' });
        const data = await res.json();

        if (!data.authenticated) {
          window.location.href = '/';
          return;
        }

        const user: UserData = data.user;

        // Only approved customers may access this portal
        if (user.role !== 'approved_customer') {
          if (user.role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/';
          }
          return;
        }

        setUserData(user);

        // Try to load full customer profile
        try {
          const profileRes = await fetch('/api/customer/profile', { headers, credentials: 'include' });
          if (profileRes.ok) {
            const profileData = await profileRes.json();
            setProfile(profileData.customer || profileData.profile || null);
          }
        } catch {
          // Profile endpoint optional — gracefully degrade
        }
      } catch {
        window.location.href = '/';
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    localStorage.removeItem('woo_session_token');
    localStorage.removeItem('woo_user');
    window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: null }));
    window.location.href = '/';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading your portal…</p>
        </div>
      </div>
    );
  }

  if (!userData) return null;

  const tabs = [
    { id: 'overview' as const, label: 'Overview', icon: Star },
    { id: 'profile' as const, label: 'Business Profile', icon: Building2 },
    { id: 'orders' as const, label: 'My Orders', icon: Package },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#FF6B00] to-[#E85F00] flex items-center justify-center">
                <ShieldCheck className="w-4.5 h-4.5 text-white" />
              </div>
              <span className="text-sm font-bold text-slate-900 hidden sm:block">Wholesale of Oklahoma</span>
            </a>
            <ChevronRight className="w-4 h-4 text-slate-300 hidden sm:block" />
            <span className="text-sm font-semibold text-slate-600 hidden sm:block">Customer Portal</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-full">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-xs text-emerald-700 font-semibold">Approved Account</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 font-medium transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-[#FF6B00]" />
            <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-[#FF6B00]" />
          </div>
          <div className="relative">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <p className="text-orange-400 text-sm font-semibold mb-1">Welcome back,</p>
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {profile?.businessName || userData.businessName || userData.email}
                </h1>
                <p className="text-slate-400 text-sm mt-1">
                  {profile?.contactName || userData.contactName || ''}
                  {profile?.email ? ` · ${profile.email}` : ` · ${userData.email}`}
                </p>
              </div>
              <div className="flex items-center gap-2 bg-white/10 border border-white/20 px-3 py-2 rounded-xl backdrop-blur-sm">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-sm font-bold text-white">Wholesale Active</span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/#inventory"
                className="flex items-center gap-2 px-4 py-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
              >
                <Package className="w-4 h-4" />
                Browse Inventory
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              <a
                href="/account/orders"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-semibold transition-all"
              >
                <FileText className="w-4 h-4" />
                View Orders
              </a>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatCard icon={CheckCircle2} label="Account Status" value="Approved" accent />
          <StatCard icon={Key} label="Pricing Access" value={userData.has_pricing_access ? 'Enabled' : 'Active'} />
          <StatCard
            icon={Clock}
            label="Member Since"
            value={profile?.approvedAt
              ? new Date(profile.approvedAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
              : 'Active'}
          />
          <StatCard icon={Star} label="Account Type" value="Wholesale B2B" />
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="border-b border-slate-100 px-4 pt-4">
            <div className="flex gap-1">
              {tabs.map(({ id, label, icon: TabIcon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-semibold transition-all border-b-2 ${
                    activeTab === id
                      ? 'border-[#FF6B00] text-[#FF6B00] bg-orange-50/50'
                      : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <TabIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-base font-bold text-slate-900 mb-4">Account Overview</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Account Info */}
                    <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Account Info</h3>
                      <div className="space-y-2.5">
                        {[
                          { icon: User, label: 'Contact', value: profile?.contactName || userData.contactName || '—' },
                          { icon: Mail, label: 'Email / Username', value: profile?.email || userData.email },
                          { icon: Building2, label: 'Business', value: profile?.businessName || userData.businessName || '—' },
                          { icon: Phone, label: 'Phone', value: profile?.phone || '—' },
                        ].map(({ icon: RowIcon, label, value }) => (
                          <div key={label} className="flex items-center gap-3">
                            <RowIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs text-slate-400 block">{label}</span>
                              <span className="text-sm font-medium text-slate-800 truncate block">{value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Pricing Access Badge */}
                    <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          <h3 className="text-sm font-bold text-emerald-800">Wholesale Pricing Unlocked</h3>
                        </div>
                        <p className="text-xs text-emerald-700 leading-relaxed">
                          Your approved account gives you access to wholesale pricing, volume tiers, and direct inventory ordering across all product categories.
                        </p>
                      </div>
                      <a
                        href="/#inventory"
                        className="mt-4 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:text-emerald-900 transition-colors"
                      >
                        Browse Wholesale Catalog
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Quick Actions</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { href: '/#inventory', icon: Package, label: 'Browse Inventory', desc: 'View all wholesale products' },
                      { href: '/account/orders', icon: FileText, label: 'Order History', desc: 'View past and active orders' },
                      { href: '/account/addresses', icon: MapPin, label: 'Delivery Addresses', desc: 'Manage shipping addresses' },
                    ].map(({ href, icon: QIcon, label, desc }) => (
                      <a
                        key={href}
                        href={href}
                        className="flex items-start gap-3 p-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group"
                      >
                        <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 group-hover:border-[#FF6B00]/30 group-hover:bg-orange-50 transition-all">
                          <QIcon className="w-4.5 h-4.5 text-slate-500 group-hover:text-[#FF6B00] transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">{label}</p>
                          <p className="text-xs text-slate-500">{desc}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'profile' && (
              <div className="space-y-5">
                <h2 className="text-base font-bold text-slate-900">Business Profile</h2>
                {profile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Details</h3>
                      {[
                        { icon: Building2, label: 'Business Name', value: profile.businessName },
                        { icon: User, label: 'Contact Name', value: profile.contactName },
                        { icon: Mail, label: 'Email', value: profile.email },
                        { icon: Phone, label: 'Phone', value: profile.phone },
                      ].map(({ icon: RowIcon, label, value }) => value ? (
                        <div key={label} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                          <RowIcon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <span className="text-xs text-slate-400 block">{label}</span>
                            <span className="text-sm font-medium text-slate-800">{value}</span>
                          </div>
                        </div>
                      ) : null)}
                    </div>
                    {profile.address && (
                      <div className="space-y-3">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Business Address</h3>
                        <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <MapPin className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-sm font-medium text-slate-800">{profile.address.street}</p>
                            <p className="text-sm text-slate-600">
                              {profile.address.city}, {profile.address.state} {profile.address.zip}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Business profile details not available.</p>
                    <p className="text-slate-400 text-xs mt-1">Contact support at (405) 768-2975</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="text-center py-10">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <h3 className="text-base font-bold text-slate-700 mb-2">Order History</h3>
                <p className="text-sm text-slate-500 mb-4">
                  View your complete order history and track current deliveries.
                </p>
                <a
                  href="/account/orders"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white rounded-xl text-sm font-semibold transition-all shadow-sm"
                >
                  <FileText className="w-4 h-4" />
                  View Full Order History
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-xs text-slate-400">
            Questions? Call us at{' '}
            <a href="tel:4057682975" className="text-[#FF6B00] font-semibold hover:underline">
              (405) 768-2975
            </a>
            {' '}· 4500 S Bryant Ave, Oklahoma City, OK 73135
          </p>
        </div>
      </div>
    </div>
  );
}
