import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminActivation() {
  const [token, setToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
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
      setTokenError('No activation token was provided. Please use the link sent to your email.');
      return;
    }

    // Verify token validity with backend
    fetch(`/api/auth/verify-token?token=${encodeURIComponent(tokenParam)}&type=ADMIN_ACTIVATION`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsValidToken(true);
          setAdminEmail(data.email || 'order2wholesaleofoklahoma@gmail.com');
        } else {
          setIsValidToken(false);
          setTokenError(data.message || 'This activation link has expired or has already been used.');
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
      setFormError('Administrator password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
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
        throw new Error(data.message || data.error || 'Failed to activate administrator account.');
      }

      if (data.token) {
        try {
          localStorage.setItem('woo_session_token', data.token);
          localStorage.setItem('woo_user', JSON.stringify({ role: 'admin', email: adminEmail }));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: { role: 'admin', email: adminEmail } }));
      setIsSuccess(true);

      setTimeout(() => {
        window.location.href = '/admin';
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'Error creating administrator password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-[#F7F7F5]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white mx-auto shadow-xl shadow-[#FF6B00]/20 mb-4">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F7F7F5]">
          Administrator Setup
        </h2>
        <p className="mt-1 text-xs text-[#858C96]">
          Wholesale of Oklahoma • Initial Password Creation
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-[#15191F] py-8 px-6 sm:px-10 border border-[#2A3038] rounded-3xl shadow-2xl space-y-6">
          {isVerifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-[#858C96]">Verifying cryptographic activation token...</p>
            </div>
          ) : !isValidToken ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-500/15 text-red-400 flex items-center justify-center mx-auto border border-red-500/30">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-[#F7F7F5]">Invalid or Expired Link</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed max-w-sm mx-auto">
                {tokenError || 'This activation token is invalid or has expired. For security, single-use activation tokens expire in 24 hours.'}
              </p>
              <div className="pt-2">
                <a
                  href="/admin/login"
                  className="inline-block px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-colors"
                >
                  Go to Admin Login
                </a>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-8 space-y-4 animate-fadeIn">
              <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-[#F7F7F5]">Password Created!</h3>
              <p className="text-xs text-[#B8BDC5]">
                Your administrator credentials have been securely registered. Redirecting to the admin portal...
              </p>
              <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00] mx-auto mt-2" />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-[#1B2027] border border-[#2A3038] text-xs space-y-1">
                <span className="text-[#858C96] block">Configuring Admin Access For:</span>
                <span className="text-[#F7F7F5] font-mono font-bold block">{adminEmail}</span>
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
                  New Administrator Password
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
                By setting this password, the single-use token will be permanently invalidated and your ADMIN role will be authorized.
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving Secure Credentials...</span>
                  </>
                ) : (
                  <span>Activate & Unlock Admin Portal</span>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
