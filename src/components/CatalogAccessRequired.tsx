import React from 'react';
import {
  Lock,
  ShieldCheck,
  UserCheck,
  Phone,
  ArrowLeft,
  AlertCircle,
  Clock,
  CheckCircle2,
  Package,
} from 'lucide-react';

interface CatalogAccessRequiredProps {
  currentUser?: {
    email?: string;
    role?: string;
    status?: string;
    businessName?: string;
    contactName?: string;
  } | null;
  onOpenLogin: () => void;
  onOpenApplication: () => void;
}

export const CatalogAccessRequired: React.FC<CatalogAccessRequiredProps> = ({
  currentUser,
  onOpenLogin,
  onOpenApplication,
}) => {
  const isPending =
    currentUser?.role === 'pending_customer' ||
    currentUser?.status === 'PENDING' ||
    currentUser?.status === 'NEEDS_INFORMATION';
  const isSuspended = currentUser?.status === 'SUSPENDED';
  const isRejected = currentUser?.status === 'REJECTED';

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#0A0E17] text-slate-900 dark:text-white flex flex-col justify-between selection:bg-[#FF6B00]/30 selection:text-white font-sans transition-colors duration-200">
      {/* Top Bar */}
      <header className="w-full border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-[#0B0F17]/80 backdrop-blur-md py-4 px-6 sm:px-10 flex items-center justify-between">
        <a
          href="/"
          className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 hover:text-[#FF6B00] dark:hover:text-[#FF7A1A] transition-colors"
        >
          <span className="w-8 h-8 rounded-xl bg-[#FF6B00] text-white flex items-center justify-center font-black text-sm shadow-sm">
            W
          </span>
          <span>Wholesale of Oklahoma</span>
        </a>

        <a
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-[#FF6B00] dark:hover:text-[#FF7A1A] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </a>
      </header>

      {/* Main Center Card */}
      <main className="flex-1 flex items-center justify-center px-4 sm:px-6 py-12 relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#FF6B00]/10 dark:bg-[#FF6B00]/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 max-w-xl w-full bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-xs mx-auto">
            <Lock className="w-3.5 h-3.5" />
            <span>Wholesale Access Gate</span>
          </div>

          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-[#FF6B00] text-white flex items-center justify-center mx-auto shadow-xl shadow-orange-500/25 ring-8 ring-orange-500/10">
            {isPending ? (
              <Clock className="w-10 h-10 animate-pulse" />
            ) : isSuspended || isRejected ? (
              <AlertCircle className="w-10 h-10" />
            ) : (
              <Lock className="w-10 h-10 stroke-[2.2]" />
            )}
          </div>

          {/* Title & Description */}
          <div className="space-y-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              {isPending
                ? 'Account Application Under Review'
                : isSuspended
                ? 'Wholesale Account Suspended'
                : isRejected
                ? 'Wholesale Application Not Approved'
                : 'Approved Account Required'}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-md mx-auto">
              {isPending ? (
                <>
                  Your wholesale application for{' '}
                  <strong className="text-slate-900 dark:text-white">
                    {currentUser?.businessName || currentUser?.email}
                  </strong>{' '}
                  is currently under review by our Oklahoma City compliance team.
                </>
              ) : isSuspended ? (
                <>
                  Your retailer account is temporarily suspended. Wholesale catalog browsing and ordering are disabled. Please contact dispatch for immediate assistance.
                </>
              ) : isRejected ? (
                <>
                  Your wholesale account application was not approved. Wholesale pricing and inventory access are restricted to licensed B2B partners.
                </>
              ) : (
                <>
                  Our master wholesale catalog, 900+ live Zoho SKUs, and case tier pricing are strictly restricted to verified B2B retail partners in accordance with Oklahoma tobacco and dispensary distribution laws.
                </>
              )}
            </p>
          </div>

          {/* Status info box */}
          {isPending && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200 font-bold">
                <Clock className="w-4 h-4 shrink-0 text-amber-600" />
                <span>Verification in Progress</span>
              </div>
              <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
                We verify state resale certificates, FEIN, and tobacco/dispensary licensing for every commercial partner. Typical turnaround is under 2 business hours. You will receive an activation email as soon as your account is approved.
              </p>
            </div>
          )}

          {isSuspended && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl p-4 text-left text-xs space-y-2">
              <div className="flex items-center gap-2 text-rose-800 dark:text-rose-200 font-bold">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>Action Required</span>
              </div>
              <p className="text-rose-700 dark:text-rose-300 leading-relaxed">
                Please contact central warehouse dispatch at <strong className="text-rose-900 dark:text-white">(405) 768-2975</strong> or email <strong className="text-rose-900 dark:text-white">wholesaleofoklahoma@gmail.com</strong> to reactivate your wholesale privileges.
              </p>
            </div>
          )}

          {/* Action CTAs */}
          <div className="space-y-3 pt-2">
            {!currentUser ? (
              <>
                <button
                  type="button"
                  onClick={onOpenLogin}
                  className="w-full bg-[#FF6B00] hover:bg-[#E85F00] text-white text-sm font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Log In to Your Retailer Account</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenApplication}
                  className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-white text-sm font-bold py-3.5 px-6 rounded-2xl transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                >
                  <UserCheck className="w-4 h-4 text-[#FF6B00]" />
                  <span>Apply for Wholesale Retailer Account</span>
                </button>
              </>
            ) : (
              <a
                href="tel:4057682975"
                className="w-full bg-[#FF6B00] hover:bg-[#E85F00] text-white text-sm font-bold py-3.5 px-6 rounded-2xl shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call OKC Dispatch: (405) 768-2975</span>
              </a>
            )}
          </div>

          {/* Compliance Footer Pills */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center justify-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>Licensed Master Wholesaler</span>
            </span>
            <span className="flex items-center justify-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>21+ Verified Retailers Only</span>
            </span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-4 px-6 text-center text-xs text-slate-500 dark:text-slate-400">
        Wholesale of Oklahoma · 4500 S Bryant Ave, Oklahoma City, OK 73135 · (405) 768-2975
      </footer>
    </div>
  );
};

export default CatalogAccessRequired;
