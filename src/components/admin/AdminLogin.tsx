import React, { useState, useEffect } from 'react';
import { ShieldAlert, Lock, Mail, Loader2, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Sparkles, Send } from 'lucide-react';

export default function AdminLogin() {
  const [email, setEmail] = useState('order2wholesaleofoklahoma@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUnactivated, setIsUnactivated] = useState(false);
  const [activationSent, setActivationSent] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  // Recovery views: 'login' | 'forgot' | 'setup'
  const [viewMode, setViewMode] = useState<'login' | 'forgot' | 'setup'>('login');
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryMsg, setRecoveryMsg] = useState('');

  // Check URL query parameters for notifications
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'success') {
      setNoticeMessage('Your administrator password was successfully updated. Please sign in with your new password.');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsUnactivated(false);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        const msg = data.message || data.error || 'Authentication failed.';
        if (data.error === 'ACCOUNT_NOT_ACTIVATED' || msg.includes('ACCOUNT_NOT_ACTIVATED') || msg.includes('not yet been activated')) {
          setIsUnactivated(true);
          throw new Error('Your administrator account has not set a password yet. Please request an activation link below to set your credentials.');
        }
        throw new Error('Invalid email or password.');
      }

      if (data.user?.role !== 'admin') {
        throw new Error('Access denied: Administrator privileges required.');
      }

      if (data.token) {
        try {
          localStorage.setItem('woo_session_token', data.token);
          localStorage.setItem('woo_user', JSON.stringify(data.user));
        } catch (_) {}
      }

      window.dispatchEvent(new CustomEvent('woo-auth-changed', { detail: data.user }));
      window.location.href = '/admin';
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid administrator credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestActivation = async (targetEmail?: string) => {
    const emailToUse = (targetEmail || email || recoveryEmail).trim().toLowerCase();
    if (!emailToUse) return;

    setIsSubmitting(true);
    setDevLink(null);

    try {
      const res = await fetch('/api/auth/admin/request-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailToUse }),
      });

      const data = await res.json();
      setActivationSent(true);
      setRecoverySent(true);
      setRecoveryMsg(data.message || 'Activation instructions dispatched to administrator email.');
      if (data.devActivationUrl) {
        setDevLink(data.devActivationUrl);
      }
    } catch (err: any) {
      setActivationSent(true);
      setRecoverySent(true);
      setRecoveryMsg('If an administrator account exists, activation instructions have been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = recoveryEmail.trim().toLowerCase();
    if (!clean) return;

    setIsSubmitting(true);
    setDevLink(null);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: clean, role: 'admin' }),
      });
      const data = await res.json();
      setRecoverySent(true);
      setRecoveryMsg(data.message || 'Password reset link dispatched.');
      if (data.devResetUrl) {
        setDevLink(data.devResetUrl);
      }
    } catch (_) {
      setRecoverySent(true);
      setRecoveryMsg('If an administrator account exists with this email address, password reset instructions have been sent.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#FF6B00] flex items-center justify-center text-white mx-auto shadow-xl shadow-[#FF6B00]/20 mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
          Administrator Portal
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Wholesale of Oklahoma • Production Management & Dispatch
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 rounded-3xl shadow-xl space-y-6">
          {noticeMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{noticeMessage}</span>
            </div>
          )}

          {viewMode === 'forgot' ? (
            /* Forgot Password Flow */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <KeyRound className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">Reset Admin Password</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setRecoverySent(false);
                    setDevLink(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>

              {recoverySent ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Reset Instructions Dispatched
                  </div>
                  <p className="leading-relaxed">
                    If an administrator account exists for <strong>{recoveryEmail}</strong>, a secure single-use password reset link has been dispatched.
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Click the link in your email to open the <strong>/admin/reset-password</strong> page and choose a new password.
                  </p>
                  {devLink && (
                    <div className="pt-2 border-t border-emerald-200">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Development Quick Access:</span>
                      <a
                        href={devLink}
                        className="inline-block px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E05E00]"
                      >
                        Open Reset Password Link
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Enter your verified administrator email address. We will send you a secure link to create a new password on <strong>/admin/reset-password</strong>.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Administrator Email
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="order2wholesaleofoklahoma@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Dispatching Link...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Password Reset Link</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          ) : viewMode === 'setup' ? (
            /* First Time Admin Setup Flow */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                <div className="flex items-center gap-1.5 text-slate-900">
                  <Sparkles className="w-4 h-4 text-[#FF6B00]" />
                  <h3 className="text-sm font-bold uppercase tracking-wider">First-Time Admin Setup</h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('login');
                    setRecoverySent(false);
                    setDevLink(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Login
                </button>
              </div>

              {recoverySent ? (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-3">
                  <div className="flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Setup Invitation Dispatched
                  </div>
                  <p className="leading-relaxed">
                    An activation invitation has been dispatched to <strong>{recoveryEmail}</strong>.
                  </p>
                  <p className="text-[11px] text-emerald-700">
                    Click the single-use link in your inbox to set your initial administrator password and unlock the dashboard.
                  </p>
                  {devLink && (
                    <div className="pt-2 border-t border-emerald-200">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Local Development Quick Access:</span>
                      <a
                        href={devLink}
                        className="inline-block px-3 py-1.5 bg-[#FF6B00] text-white rounded-lg text-xs font-bold hover:bg-[#E05E00]"
                      >
                        Open Activation Link
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Has your administrator account not been configured with a password yet? Enter the configured administrator email below to receive a secure, single-use activation link.
                  </p>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                      Administrator Email
                    </label>
                    <input
                      type="email"
                      required
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="order2wholesaleofoklahoma@gmail.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00]"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRequestActivation(recoveryEmail)}
                    disabled={isSubmitting || !recoveryEmail.trim()}
                    className="w-full py-3 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Setup Link...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Send Initial Password Setup Link</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Main Admin Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-medium">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                  {isUnactivated && (
                    <div className="pt-2 border-t border-rose-200">
                      {activationSent ? (
                        <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Setup link sent! Check your email.
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleRequestActivation(email)}
                          disabled={isSubmitting}
                          className="w-full py-2 px-3 rounded-lg bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <Send className="w-3 h-3" /> Send Password Setup Link Now
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Administrator Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="order2wholesaleofoklahoma@gmail.com"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setRecoveryEmail(email);
                      setViewMode('forgot');
                    }}
                    className="text-[11px] text-[#FF6B00] hover:underline cursor-pointer font-semibold"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-4 pr-10 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E05E00] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Privileges...</span>
                  </>
                ) : (
                  <span>Sign In as Administrator</span>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryEmail(email);
                    setViewMode('setup');
                  }}
                  className="text-xs text-slate-500 hover:text-[#FF6B00] transition-colors cursor-pointer inline-flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-[#FF6B00]" />
                  <span>First-time admin? Set up your password</span>
                </button>
              </div>
            </form>
          )}

          <div className="pt-4 border-t border-slate-200 text-center">
            <a
              href="/"
              className="text-xs text-slate-500 hover:text-slate-900 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" /> Return to Customer Storefront
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
