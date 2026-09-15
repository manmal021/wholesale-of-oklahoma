import React, { useState, useEffect } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Ban } from 'lucide-react';

export default function AgeGateModal() {
  // Always require verification on every visit/access (do not persist across sessions)
  const [isVerified, setIsVerified] = useState(false);
  const [underAgeLockout, setUnderAgeLockout] = useState(false);

  useEffect(() => {
    // Clear any previous persistent cookie or localStorage to ensure verification is prompted on every access
    try {
      localStorage.removeItem('woo_age_verified');
      document.cookie = 'woo_age_verified=; Path=/; Max-Age=0; SameSite=Lax';
    } catch (_) {}

    // Lock background scrolling while age verification is pending
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handleVerifyYes = () => {
    setIsVerified(true);
    document.body.style.overflow = '';
  };

  const handleVerifyNo = () => {
    setUnderAgeLockout(true);
    document.body.style.overflow = 'hidden';
  };

  if (isVerified) return null;

  return (
    <aside
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-slate-900/70 backdrop-blur-md"
      aria-label="Age verification required"
    >
      <div className="relative w-full max-w-lg bg-white border-2 border-[#FF6B00]/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-10 text-center space-y-6 text-slate-900">
        {/* Glow effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#FF6B00]/10 blur-3xl pointer-events-none" />

        {underAgeLockout ? (
          /* Under 21 Lockout State */
          <div className="space-y-6 py-4 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto shadow-lg">
              <Ban className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Access Denied
              </h2>
              <p className="text-slate-600 text-sm leading-relaxed max-w-sm mx-auto">
                You must be 21 years of age or older to enter Wholesale of Oklahoma. Products in this portal are strictly age-restricted and regulated by state and federal law.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600">
              Please close this browser window or navigate away from this site.
            </div>
          </div>
        ) : (
          /* 21+ Age Gate Question */
          <>
            {/* Header Badge */}
            <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
              <ShieldAlert className="w-4 h-4" />
              <span>Age Verification Required</span>
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
                Are you 21 years of age or older?
              </h2>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
                Wholesale of Oklahoma is a licensed B2B distributor of age-restricted vapor, tobacco alternatives, and accessories intended solely for qualified commercial retailers.
              </p>
            </div>

            {/* Regulatory Notice Banner */}
            <div className="bg-orange-50/70 border border-orange-200 rounded-2xl p-4 text-left space-y-1">
              <div className="flex items-center gap-2 text-[#FF6B00] text-[11px] font-bold uppercase tracking-wider">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Oklahoma & Federal Compliance:</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-snug">
                Sales are restricted strictly to legal adults 21+ holding valid retail business credentials. Falsifying age or business identity is prohibited by law.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleVerifyYes}
                className="flex-1 py-4 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-black text-sm uppercase tracking-widest rounded-full transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                <span>YES, I AM 21+</span>
              </button>

              <button
                type="button"
                onClick={handleVerifyNo}
                className="sm:w-44 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 font-bold text-xs uppercase tracking-widest rounded-full transition-colors cursor-pointer border border-slate-300"
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
