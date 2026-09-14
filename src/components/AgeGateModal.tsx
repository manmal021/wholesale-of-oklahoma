import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Ban, Building } from 'lucide-react';

export default function AgeGateModal() {
  const [isVerified, setIsVerified] = useState(true); // Default to true while checking cookie
  const [underAgeLockout, setUnderAgeLockout] = useState(false);

  useEffect(() => {
    // Check cookie or localStorage
    const hasCookie = document.cookie.split('; ').some((row) => row.startsWith('woo_age_verified=true'));
    const hasStorage = localStorage.getItem('woo_age_verified') === 'true';

    if (!hasCookie && !hasStorage) {
      setIsVerified(false);
      document.body.style.overflow = 'hidden';
    }
  }, []);

  const handleVerifyYes = () => {
    // Set 30-day persistent cookie with SameSite=Lax
    const maxAge = 30 * 24 * 60 * 60;
    const isSecure = window.location.protocol === 'https:';
    document.cookie = `woo_age_verified=true; Path=/; Max-Age=${maxAge}; SameSite=Lax${isSecure ? '; Secure' : ''}`;
    try {
      localStorage.setItem('woo_age_verified', 'true');
    } catch (_) {}

    setIsVerified(true);
    document.body.style.overflow = '';
  };

  const handleVerifyNo = () => {
    setUnderAgeLockout(true);
  };

  if (isVerified) return null;

  return (
    <aside
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-[#0f172A]/95 backdrop-blur-xl"
      aria-label="Age verification required"
    >
      <div className="relative w-full max-w-lg bg-[#0f172A] border-2 border-[#F97316]/50 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-10 text-center space-y-6">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#F97316]/20 blur-3xl pointer-events-none" />

        {underAgeLockout ? (
          /* Under 21 Lockout State */
          <div className="space-y-6 py-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <Ban className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Access Denied
              </h2>
              <p className="text-slate-300 text-sm leading-relaxed max-w-sm mx-auto">
                You must be 21 years of age or older to enter Wholesale of Oklahoma. Products in this portal are strictly age-restricted and regulated by state and federal law.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400">
              Please close this browser window or navigate away from this site.
            </div>
          </div>
        ) : (
          /* 21+ Age Gate Question */
          <>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 bg-[#F97316]/15 border border-[#F97316]/40 text-[#F97316] text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              <ShieldAlert className="w-4 h-4" />
              <span>Age Verification Required</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
                Are you 21 years of age or older?
              </h2>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                Wholesale of Oklahoma is a licensed B2B distributor of age-restricted vapor, tobacco alternatives, and accessories intended solely for qualified commercial retailers.
              </p>
            </div>

            {/* Regulatory Notice Banner */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center gap-2 text-[#F97316] text-[11px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Oklahoma & Federal Compliance:</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Sales are restricted strictly to legal adults 21+ holding valid retail business credentials. Falsifying age or business identity is prohibited by law.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleVerifyYes}
                className="flex-1 py-4 bg-[#F97316] hover:bg-[#ea580c] text-white font-black text-sm uppercase tracking-widest rounded-full transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>YES, I AM 21+</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyNo}
                className="sm:w-44 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-widest rounded-full transition-colors cursor-pointer border border-slate-700"
              >
                NO, I AM UNDER 21
              </button>
            </div>

            <p className="text-[10px] text-slate-500 pt-1">
              By clicking YES, you certify under penalty of law that you are at least 21 years of age.
            </p>
          </>
        )}
      </div>
    </aside>
  );
}
