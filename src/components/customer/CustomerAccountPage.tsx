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
  AlertCircle
} from 'lucide-react';

export default function CustomerAccountPage() {
  const [userData, setUserData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [pwMessage, setPwMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMessage(null);

    if (newPassword.length < 8) {
      setPwMessage({ type: 'error', text: 'New password must be at least 8 characters long.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMessage({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    setIsChangingPassword(true);
    try {
      // Send reset request
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
        setNewPassword('');
        setConfirmPassword('');
      } else {
        throw new Error('Failed to initiate password change.');
      }
    } catch (err: any) {
      setPwMessage({ type: 'error', text: err.message || 'Error updating password.' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
          <p className="text-xs text-[#858C96]">Loading customer account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Header */}
      <header className="bg-[#15191F] border-b border-[#2A3038] px-4 sm:px-8 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white shadow-md">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-[#F7F7F5]">
                  {userData?.businessName || 'Wholesale Customer Account'}
                </h1>
                <span className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Verified B2B Retailer
                </span>
              </div>
              <p className="text-xs text-[#858C96]">{userData?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/"
              className="px-4 py-2 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-1.5"
            >
              <Package className="w-3.5 h-3.5" />
              <span>Shop Wholesale Catalog</span>
            </a>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-rose-400 border border-rose-500/20 transition-colors cursor-pointer"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Status Callout Banner */}
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-[#15191F] to-[#15191F] border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Wholesale Pricing Access Active</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#F7F7F5]">
              Authorized Oklahoma Resale Account
            </h2>
            <p className="text-xs sm:text-sm text-[#B8BDC5] max-w-xl leading-relaxed">
              Your business entity has been verified for tax-exempt B2B wholesale pricing. Live rates and instant carton ordering are enabled across the full catalog.
            </p>
          </div>

          <a
            href="/"
            className="px-6 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/25 transition-all hover:scale-105 shrink-0"
          >
            <span>Browse Active Products</span>
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>

        {/* Profile Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Business & Contact Card */}
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business & Contact Profile
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#858C96] block">Legal Entity:</span>
                <span className="text-sm font-bold text-[#F7F7F5]">{userData?.businessName || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[#858C96] block">Authorized Contact:</span>
                <span className="text-[#F7F7F5] font-semibold">{userData?.contactName || 'Representative'}</span>
              </div>
              <div>
                <span className="text-[#858C96] block">Verified Email:</span>
                <span className="text-[#F7F7F5] font-mono">{userData?.email}</span>
              </div>
              <div>
                <span className="text-[#858C96] block">Account ID:</span>
                <code className="text-[#858C96] font-mono">{userData?.id || userData?.userId}</code>
              </div>
            </div>
          </div>

          {/* Compliance & Wholesale Status */}
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Commercial Privileges
            </h3>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-[#858C96] block">Authorization Tier:</span>
                <span className="text-[#F7F7F5] font-bold">Licensed Retail Reseller</span>
              </div>
              <div>
                <span className="text-[#858C96] block">Dispatch Warehouse:</span>
                <span className="text-[#F7F7F5]">Oklahoma City Central Warehouse</span>
              </div>
              <div>
                <span className="text-[#858C96] block">Same-Day Local Delivery:</span>
                <span className="text-emerald-400 font-semibold">Enabled for orders submitted before 1:00 PM CST</span>
              </div>
            </div>
          </div>
        </div>

        {/* Change Password Section */}
        <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 space-y-5 max-w-xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
            <Lock className="w-4 h-4" />
            Security & Password Update
          </h3>

          <p className="text-xs text-[#858C96] leading-relaxed">
            Need to update your wholesale account credentials? Request a secure single-use password reset link sent to your registered email.
          </p>

          {pwMessage && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2 ${
                pwMessage.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-500/15 border border-red-500/40 text-red-400'
              }`}
            >
              {pwMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              )}
              <span>{pwMessage.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <button
              type="submit"
              disabled={isChangingPassword}
              className="px-5 py-2.5 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-white font-bold text-xs border border-[#2A3038] hover:border-[#FF6B00] transition-colors flex items-center gap-2 cursor-pointer"
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
      </main>
    </div>
  );
}
