import React, { useState, useEffect } from 'react';
import { X, LogIn, Lock, Mail, ShieldCheck, AlertCircle, Loader2, UserPlus } from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  onLoginSuccess?: () => void;
  onOpenApplication?: () => void;
}

export default function LoginModal({
  isOpen,
  onClose,
  onSuccess,
  onLoginSuccess,
  onOpenApplication,
}: LoginModalProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed. Please check your credentials.');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0f172A]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
    >
      <div
        className="relative w-full max-w-md bg-[#0f172A] border border-slate-700 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F97316]/20 border border-[#F97316]/40 flex items-center justify-center text-[#F97316]">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h2 id="login-modal-title" className="text-lg font-bold text-white tracking-tight">
                Wholesale Portal Login
              </h2>
              <p className="text-[11px] text-slate-400">Verified Retail Accounts Only</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close login modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2.5 mb-5" role="alert">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#F97316]" />
              Business Email
            </label>
            <input
              id="login-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="retailer@business.com"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition-colors"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-[#F97316]" />
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-[#F97316] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all shadow-lg hover:scale-[1.01] active:scale-[0.99] cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verifying Credentials...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In to View Pricing</span>
              </>
            )}
          </button>
        </form>

        <div className="pt-6 mt-6 border-t border-slate-800 text-center space-y-3">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Don't have an approved account?</span>
          </div>

          <button
            type="button"
            onClick={handleOpenApply}
            className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-full border border-white/20 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#F97316]" />
            <span>Apply for Wholesale Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}
