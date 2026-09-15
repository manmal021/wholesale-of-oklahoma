import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle, ArrowRight } from 'lucide-react';

export default function AccountActivation() {
  const [token, setToken] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token') || '';
    setToken(tokenParam);

    if (!tokenParam) {
      setIsVerifying(false);
      setTokenError('No activation token provided. Please use the activation button from your approval email.');
      return;
    }

    fetch(`/api/auth/verify-token?token=${encodeURIComponent(tokenParam)}&type=CUSTOMER_ACTIVATION`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsValidToken(true);
          setCustomerEmail(data.email || '');
        } else {
          setIsValidToken(false);
          setTokenError(data.message || 'This activation link is invalid, expired, or has already been used.');
        }
      })
      .catch(() => {
        setIsValidToken(false);
        setTokenError('Could not verify activation token. Please check your internet connection.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please verify.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Account activation failed.');
      }

      if (data.token) {
        try {
          localStorage.setItem('woo_session_token', data.token);
          localStorage.setItem('woo_user', JSON.stringify({ role: 'approved_customer', email: customerEmail }));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: { role: 'approved_customer', email: customerEmail } }));
      setIsSuccess(true);

      setTimeout(() => {
        window.location.href = '/account';
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error activating wholesale account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#F7F7F5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto shadow-xl mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F7F7F5]">
          Activate Wholesale Account
        </h2>
        <p className="mt-1 text-xs text-[#858C96]">
          Wholesale of Oklahoma • Password Setup & Account Activation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#15191F] py-8 px-6 sm:px-10 border border-[#2A3038] rounded-3xl shadow-2xl space-y-6">
          {isVerifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-[#858C96]">Verifying your activation invitation...</p>
            </div>
          ) : !isValidToken ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F7F7F5]">Link Expired or Already Used</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed max-w-sm mx-auto">
                {tokenError || 'This activation link has expired or has already been used. Please sign in or contact dispatch.'}
              </p>
              <div className="pt-2">
                <a
                  href="/"
                  className="inline-block px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Return to Storefront
                </a>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#F7F7F5]">Account Activated!</h3>
              <p className="text-xs text-[#B8BDC5]">
                Your wholesale customer password has been set. Live wholesale pricing is now unlocked for your account.
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00] mx-auto mt-2" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-[#1B2027] border border-[#2A3038] text-xs space-y-1">
                <span className="text-[#858C96] block">Activating Wholesale Account:</span>
                <span className="text-[#F7F7F5] font-mono font-bold block">{customerEmail}</span>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#858C96] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Create Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#858C96] mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Confirm Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div className="text-[11px] text-[#858C96] leading-relaxed">
                After saving your password, your Wholesale of Oklahoma shopping session will be established and live wholesale pricing will be unlocked.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating Account...</span>
                  </>
                ) : (
                  <span>Activate & Start Wholesale Shopping</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
