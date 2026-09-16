import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, Loader2, CheckCircle2, AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react';

export default function AdminResetPassword() {
  const [token, setToken] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      setTokenError('No password reset token was provided. Please use the link dispatched to your administrator email.');
      return;
    }

    // Verify reset token validity with backend
    fetch(`/api/auth/verify-token?token=${encodeURIComponent(tokenParam)}&type=PASSWORD_RESET`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setIsValidToken(true);
          setAdminEmail(data.email || 'order2wholesaleofoklahoma@gmail.com');
        } else {
          setIsValidToken(false);
          setTokenError(data.message || 'This password reset link has expired or has already been used.');
        }
      })
      .catch(() => {
        setIsValidToken(false);
        setTokenError('Could not verify password reset token. Please check your internet connection.');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, []);

  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!hasMinLength) {
      setFormError('Administrator password must be at least 8 characters long.');
      return;
    }

    if (!hasLetter || !hasNumber) {
      setFormError('Password must contain both letters and at least one number for administrative security.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to update administrator password.');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setFormError(err.message || 'Error updating administrator password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white mx-auto shadow-xl shadow-[#FF6B00]/20 mb-4">
          <KeyRound className="w-7 h-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Reset Admin Password
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Wholesale of Oklahoma • Production Security Management
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-3xl shadow-xl space-y-6">
          {isVerifying ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Verifying single-use security token...</p>
            </div>
          ) : !isValidToken ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Invalid or Expired Link</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                {tokenError || 'This password reset link is invalid or has expired. Password reset links expire within 2 hours for administrative security.'}
              </p>
              <div className="pt-2">
                <a
                  href="/admin/login"
                  className="inline-block px-5 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-sm"
                >
                  Return to Admin Login
                </a>
              </div>
            </div>
          ) : isSuccess ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Password Updated!</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-sm mx-auto">
                Your administrator password has been securely updated and stored. You can now log into the Wholesale of Oklahoma administrative portal with your new credentials.
              </p>
              <div className="pt-3">
                <a
                  href="/admin/login"
                  className="inline-block px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md"
                >
                  Proceed to Admin Login
                </a>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
                <span className="text-slate-500 block font-medium">Resetting Credentials For:</span>
                <span className="text-slate-900 font-mono font-bold block">{adminEmail}</span>
              </div>

              {formError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                    New Administrator Password
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Confirm New Password
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              {/* Password Requirements Checklist */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[11px] space-y-1.5">
                <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Security Standards
                </div>
                <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  Minimum 8 characters in length
                </div>
                <div className={`flex items-center gap-1.5 ${hasLetter && hasNumber ? 'text-emerald-700 font-semibold' : 'text-slate-500'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${hasLetter && hasNumber ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  Contains both letters and numbers
                </div>
                {confirmPassword && (
                  <div className={`flex items-center gap-1.5 ${passwordsMatch ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${passwordsMatch ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <span>Set New Password & Complete Reset</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <a
                  href="/admin/login"
                  className="text-xs text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" /> Back to Admin Login
                </a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
