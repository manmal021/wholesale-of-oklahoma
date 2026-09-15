import React, { useState, useEffect } from 'react';
import { X, LogIn, Lock, Mail, ShieldCheck, AlertCircle, Loader2, UserPlus, HelpCircle } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onLoginSuccess?: () => void;
  onOpenApplication?: () => void;
  onOpenForgotPassword?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  onOpenApplication,
  onOpenForgotPassword,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setErrorCode(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorCode(data.error);
        throw new Error(data.message || data.error || 'Login failed. Please check your credentials.');
      }

      // Store auth session token for client authorization
      if (data.token) {
        try {
          localStorage.setItem('woo_session_token', data.token);
          localStorage.setItem('woo_user', JSON.stringify(data.user));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: data.user }));

      if (onSuccess) onSuccess();
      if (onLoginSuccess) onLoginSuccess();
      onClose();

      // If administrator logged in, navigate to /admin
      if (data.user?.role === 'admin') {
        window.location.href = '/admin';
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to log in.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenApply = () => {
    onClose();
    if (onOpenApplication) {
      onOpenApplication();
    } else {
      window.dispatchEvent(new CustomEvent('open-wholesale-application'));
    }
  };

  const handleForgotPassword = () => {
    onClose();
    if (onOpenForgotPassword) {
      onOpenForgotPassword();
    } else {
      window.location.href = '/reset-password';
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6B00]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="login-modal-title" className="text-lg font-bold text-slate-900 tracking-tight">
                Wholesale Portal Login
              </h2>
              <p className="text-[11px] text-slate-500">Verified Retail Accounts Only</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-900 border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Error Banners */}
        {errorMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs flex flex-col gap-1.5 mb-5 ${
              errorCode === 'ACCOUNT_PENDING'
                ? 'bg-amber-50 border border-amber-300 text-amber-900'
                : errorCode === 'ACCOUNT_SUSPENDED'
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : errorCode === 'ACCOUNT_NOT_ACTIVATED'
                ? 'bg-blue-50 border border-blue-200 text-blue-900'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
            role="alert"
          >
            <div className="flex items-center gap-2 font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                {errorCode === 'ACCOUNT_PENDING'
                  ? 'Application Under Review'
                  : errorCode === 'ACCOUNT_SUSPENDED'
                  ? 'Account Suspended'
                  : errorCode === 'ACCOUNT_NOT_ACTIVATED'
                  ? 'Activation Required'
                  : 'Authentication Notice'}
              </span>
            </div>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
              Business Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="retailer@business.com"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                Password
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-[11px] text-[#FF6B00] hover:text-[#E85F00] hover:underline cursor-pointer font-semibold"
              >
                Forgot Password?
              </button>
            </div>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E85F00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Sign In to Wholesale Portal</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-200 text-center space-y-3">
          <p className="text-xs text-slate-500">
            Don't have an approved Wholesale of Oklahoma account?
          </p>
          <button
            type="button"
            onClick={handleOpenApply}
            className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#FF6B00]" />
            Apply for Wholesale Retailer Access
          </button>
        </div>
      </div>
    </div>
  );
}
