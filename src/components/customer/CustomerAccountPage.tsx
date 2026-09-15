import React, { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  ShieldCheck,
  Package,
  LogOut,
  Lock,
  Loader2,
  CheckCircle2,
  ArrowRight,
  AlertCircle,
  Truck,
  Layers,
} from 'lucide-react';
import CustomerOrders from './CustomerOrders';
import CustomerAddresses from './CustomerAddresses';

export default function CustomerAccountPage() {
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'orders' | 'addresses' | 'profile'>('orders');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // If URL has hash or query, respect it
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      if (path.includes('/orders')) {
        setActiveTab('orders');
      } else if (path.includes('/addresses')) {
        setActiveTab('addresses');
      }
    }

    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          window.location.href = '/';
          return;
        }
        setUserData(data.user);
      })
      .catch(() => {
        window.location.href = '/';
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    try {
      localStorage.removeItem('woo_session_token');
      localStorage.removeItem('woo_user');
    } catch (_) {}
    window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: null }));
    window.location.href = '/';
  };

  const handleSendResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);
    setIsChangingPassword(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userData.email }),
      });
      if (res.ok) {
        setPwMessage({
          type: 'success',
          text: 'Password reset instructions have been dispatched to your verified business email.',
        });
      } else {
        throw new Error('Failed to initiate password reset.');
      }
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err.message || 'Error requesting reset link.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
          <p className="text-xs text-slate-500">Loading customer account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900">
                  {userData?.businessName || 'Wholesale Customer Account'}
                </h1>
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Verified B2B Retailer
                </span>
              </div>
              <p className="text-xs text-slate-500">{userData?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Shop Catalog</span>
            </a>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-3">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'orders'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Orders & Fulfillment</span>
          </button>

          <button
            onClick={() => setActiveTab('addresses')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'addresses'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Saved Delivery Addresses</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#FF6B00] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Company Profile & Security</span>
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' && <CustomerOrders />}

        {activeTab === 'addresses' && <CustomerAddresses />}

        {activeTab === 'profile' && (
          <div className="space-y-6">
            {/* Status Callout Banner */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-50 via-white to-white border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-sm">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Wholesale Pricing Access Active</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                  Authorized Oklahoma Resale Account
                </h2>
                <p className="text-xs sm:text-sm text-slate-600 max-w-xl leading-relaxed">
                  Your business entity has been verified for tax-exempt B2B wholesale pricing. Live rates and instant carton ordering are enabled across the full catalog.
                </p>
              </div>

              <a
                href="/"
                className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-sm transition-all hover:scale-105 shrink-0"
              >
                <span>Browse Active Products</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            {/* Profile Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business & Contact Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business & Contact Profile
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Legal Entity:</span>
                    <span className="text-sm font-bold text-slate-900">{userData?.businessName || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Authorized Contact:</span>
                    <span className="text-slate-800 font-semibold">{userData?.contactName || 'Representative'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Verified Email:</span>
                    <span className="text-slate-800 font-mono">{userData?.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Account ID:</span>
                    <code className="text-slate-600 font-mono bg-slate-100 px-2 py-0.5 rounded">{userData?.id || userData?.userId}</code>
                  </div>
                </div>
              </div>

              {/* Commercial Privileges */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Commercial Privileges
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Authorization Tier:</span>
                    <span className="text-slate-900 font-bold">Licensed Retail Reseller</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Dispatch Warehouse:</span>
                    <span className="text-slate-800">4500 S Bryant Ave, Oklahoma City, OK 73135</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Delivery Eligibility:</span>
                    <span className="text-emerald-700 font-semibold">Oklahoma City Metro Area (Free on $500+)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Change Password Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 space-y-4 max-w-xl shadow-xs">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                <Lock className="w-4 h-4" />
                Security & Password Update
              </h3>

              <p className="text-xs text-slate-600 leading-relaxed">
                Need to update your wholesale account credentials? Request a secure single-use password reset link sent to your registered email.
              </p>

              {pwMessage && (
                <div
                  className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                    pwMessage.type === 'success'
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                      : 'bg-rose-50 border border-rose-200 text-rose-700'
                  }`}
                >
                  {pwMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  )}
                  <span>{pwMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSendResetEmail} className="space-y-4">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="px-5 py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-300 hover:border-[#FF6B00] transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isChangingPassword ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Dispatching Reset Link...</span>
                    </>
                  ) : (
                    <span>Email Me a Password Reset Link</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
