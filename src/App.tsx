import { useState, useEffect, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  UserPlus,
  Play,
  Sparkles,
  Menu,
  X,
  Star,
  MapPin,
  Phone,
  ShoppingBag,
  Package,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  Lock,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import BoomerangVideoBg from './components/BoomerangVideoBg';
import ReviewSlider from './components/ReviewSlider';
import GallerySlider from './components/GallerySlider';
import StoreDetails from './components/StoreDetails';
import OrderForm from './components/OrderForm';
import MangoChat from './components/MangoChat';
import CartDrawer from './components/CartDrawer';
import InventorySection from './components/inventory/InventorySection';
import WholesaleApplicationModal from './components/WholesaleApplicationModal';
import AgeGateModal from './components/AgeGateModal';
import LoginModal from './components/LoginModal';
import FeaturedBrands from './components/FeaturedBrands';
import WhyChooseUs from './components/WhyChooseUs';
import { getDraftOrder } from './lib/mangoAI';

const BG_VIDEO = '/transi.mp4';

// Temporary disclaimer active for 15 days, expiring at 9-28-2026 (Oklahoma CDT)
const DISCLAIMER_EXPIRATION = new Date('2026-09-28T00:00:00-05:00').getTime();

interface CurrentUser {
  id: string;
  email: string;
  role: 'visitor' | 'pending_customer' | 'approved_customer' | 'admin';
  businessName?: string;
  contactName?: string;
  has_pricing_access: boolean;
}

export default function App() {
  const [showDisclaimer] = useState(() => Date.now() < DISCLAIMER_EXPIRATION);
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickContactMsg, setQuickContactMsg] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWholesaleModalOpen, setIsWholesaleModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [cartUnits, setCartUnits] = useState(0);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const syncCartUnits = () => {
    const items = getDraftOrder();
    setCartUnits(items.reduce((sum, item) => sum + item.quantity, 0));
  };

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentUser(data.user);
          return;
        }
      }
      setCurrentUser(null);
    } catch {
      setCurrentUser(null);
    }
  }, []);

  useEffect(() => {
    syncCartUnits();
    fetchCurrentUser();

    const handleCartUpdate = () => syncCartUnits();
    const handleOpenCart = () => setIsCartOpen(true);
    const handleOpenWholesale = () => setIsWholesaleModalOpen(true);
    const handleOpenLogin = () => setIsLoginModalOpen(true);
    const handleAuthChange = () => fetchCurrentUser();

    window.addEventListener('mango-cart-updated', handleCartUpdate);
    window.addEventListener('storage', handleCartUpdate);
    window.addEventListener('open-cart', handleOpenCart);
    window.addEventListener('open-mango-cart', handleOpenCart);
    window.addEventListener('open-wholesale-application', handleOpenWholesale);
    window.addEventListener('open-login-modal', handleOpenLogin);
    window.addEventListener('woo-auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('mango-cart-updated', handleCartUpdate);
      window.removeEventListener('storage', handleCartUpdate);
      window.removeEventListener('open-cart', handleOpenCart);
      window.removeEventListener('open-mango-cart', handleOpenCart);
      window.removeEventListener('open-wholesale-application', handleOpenWholesale);
      window.removeEventListener('open-login-modal', handleOpenLogin);
      window.removeEventListener('woo-auth-changed', handleAuthChange);
    };
  }, [fetchCurrentUser]);

  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    setCurrentUser(null);
    window.dispatchEvent(new CustomEvent('woo-auth-changed'));
    window.location.reload();
  };

  const navLinks = [
    { href: '#overview', label: 'Overview' },
    { href: '#brands', label: 'Brands' },
    { href: '#inventory', label: 'Products' },
    { href: '#why-us', label: 'Why Us' },
    { href: '#reviews', label: 'Reviews' },
    { href: '#gallery', label: 'Gallery' },
    { href: '#direct-order-section', label: 'Order Now' },
    { href: '#pricing', label: 'Contact' },
  ];

  const handleInquiryAction = () => {
    setQuickContactMsg(true);
    setTimeout(() => {
      setQuickContactMsg(false);
    }, 4000);
  };

  return (
    <div className="w-full min-h-screen bg-[#F8FAFC] text-[#0f172A] selection:bg-[#F97316]/20 relative">
      {/* 21+ Age Gate Modal (Regulatory Compliance) */}
      <AgeGateModal />

      {/* WCAG 2.2 AA Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#F97316] focus:text-white focus:font-bold focus:rounded-lg focus:shadow-2xl focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Top Header with Construction Notice & Navbar */}
      <header className="fixed top-0 left-0 right-0 z-40">
        {/* Temporary Construction Notice Banner — Automatically disappears at 9-28-2026 */}
        {showDisclaimer && (
          <aside
            role="alert"
            aria-label="Website notice"
            className="w-full bg-[#0f172A] border-b-2 border-[#F97316] text-white px-4 sm:px-8 py-3 sm:py-3.5 shadow-2xl flex items-center justify-center gap-2.5 sm:gap-3.5 text-center"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#F97316] text-white text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
              Notice
            </span>
            <p className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-white drop-shadow">
              Website under construction. Prices may not accurately reflect the original price.
            </p>
          </aside>
        )}

        {/* Responsive Premium Navbar — Smooth sticky transition on scroll */}
        <nav
          className={`w-full flex items-center justify-between px-4 sm:px-6 md:px-10 transition-all duration-300 ${
            scrolled
              ? 'bg-[#0f172A]/95 backdrop-blur-md py-3 shadow-xl border-b border-white/10'
              : 'bg-transparent py-4 sm:py-6'
          }`}
        >
          <div className="flex items-center gap-2">
            <a
              href="#overview"
              className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-sm select-none hover:text-[#F97316] transition-colors"
            >
              Wholesale of Oklahoma
            </a>
          </div>

          {/* Desktop Central Pill Nav */}
          <div className="hidden lg:flex items-center gap-1 bg-black/50 backdrop-blur-md rounded-full pl-6 pr-2 py-1 shadow-md border border-white/10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-2 font-semibold text-white/90 hover:text-[#F97316] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#direct-order-section"
              className="ml-2 bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-4 py-2 rounded-full transition-colors uppercase tracking-wider shadow"
            >
              Order Now
            </a>

            {/* Auth-Aware Desktop Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-white/20">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                    currentUser.role === 'approved_customer' || currentUser.role === 'admin'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                  }`}
                >
                  {currentUser.role === 'approved_customer' && (
                    <>
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                      Verified Retailer
                    </>
                  )}
                  {currentUser.role === 'admin' && (
                    <>
                      <ShieldCheck className="w-3 h-3 text-[#F97316]" />
                      Portal Admin
                    </>
                  )}
                  {currentUser.role === 'pending_customer' && (
                    <>
                      <Clock className="w-3 h-3 text-amber-400" />
                      Pending Review
                    </>
                  )}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-300 hover:text-white px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                  title="Logout from wholesale portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-white/20">
                <button
                  type="button"
                  onClick={() => setIsWholesaleModalOpen(true)}
                  className="text-xs font-bold text-white/90 hover:text-[#F97316] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-xs font-bold text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border border-white/20 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Right Action Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Desktop & Mobile Cart Trigger in Header */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-white hover:text-[#F97316] transition-colors cursor-pointer bg-black/45 backdrop-blur-sm px-3.5 py-2 rounded-full border border-white/10 shadow-sm hover:bg-black/60"
              aria-label={`Open Cart (${cartUnits} units)`}
            >
              <ShoppingBag className="w-4 h-4 text-[#F97316]" />
              <span className="hidden sm:inline">Cart</span>
              {cartUnits > 0 && (
                <span className="bg-[#F97316] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {cartUnits}
                </span>
              )}
            </button>

            <a
              href="tel:4057682975"
              className="hidden sm:flex items-center gap-1.5 text-xs font-extrabold text-[#F97316] hover:text-white transition-colors cursor-pointer bg-black/35 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
            >
              <Phone className="w-3.5 h-3.5 text-white" />
              (405) 768-2975
            </a>

            {/* Mobile Toggler Button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-all duration-300 hover:bg-black/60"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <Menu
                className={`w-5 h-5 absolute transition-all duration-300 ${
                  menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                }`}
              />
              <X
                className={`w-5 h-5 absolute transition-all duration-300 ${
                  menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                }`}
              />
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile Backdrop Overlay Menu */}
      <div
        className={`lg:hidden fixed inset-0 z-40 transition-opacity duration-300 ${
          menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMenuOpen(false)}
      >
        <div className="absolute inset-0 bg-[#0f172A]/60 backdrop-blur-sm" />
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-8 pb-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#F97316]">
              Navigation Links
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-xl font-semibold text-[#0f172A] py-2.5 border-b border-slate-100 transition-all duration-500 hover:text-[#F97316] ${
                  menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? `${150 + i * 50}ms` : '0ms' }}
              >
                {link.label}
              </a>
            ))}

            {/* Wholesale Cart direct item in mobile menu */}
            <button
              onClick={() => {
                setMenuOpen(false);
                setIsCartOpen(true);
              }}
              className="w-full text-left text-xl font-semibold text-[#0f172A] py-3 border-b border-slate-100 flex items-center justify-between transition-colors hover:text-[#F97316]"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#F97316]" />
                Wholesale Cart
              </span>
              {cartUnits > 0 && (
                <span className="bg-[#F97316] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                  {cartUnits} units
                </span>
              )}
            </button>

            {/* Auth Actions in Mobile Menu */}
            {currentUser ? (
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs text-slate-600">
                  Logged in as: <strong className="text-[#0f172A]">{currentUser.email}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Role: {currentUser.role.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="text-xs text-rose-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Log Out
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsLoginModalOpen(true);
                  }}
                  className="py-2.5 bg-[#0f172A] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#F97316]" />
                  Login
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsWholesaleModalOpen(true);
                  }}
                  className="py-2.5 bg-[#F97316] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Apply
                </button>
              </div>
            )}
          </div>

          {/* Mobile specific drawer buttons */}
          <div
            className={`mt-auto flex flex-col gap-3 transition-all duration-500 ${
              menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
            }`}
            style={{ transitionDelay: menuOpen ? '400ms' : '0ms' }}
          >
            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs border border-slate-200">
              <p className="font-semibold text-[#0f172A]">Central OKC Warehouse:</p>
              <p className="text-slate-500">4500 S Bryant Ave, OKC, OK 73135</p>
              <p className="text-slate-700 font-semibold">(405) 768-2975 · Mon–Sat 9AM–8PM</p>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                window.location.href = 'tel:4057682975';
              }}
              className="bg-[#0f172A] hover:bg-[#1e293b] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 shadow"
            >
              <Phone className="w-3.5 h-3.5 text-[#F97316]" />
              Call Live Dispatcher
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Landmark (WCAG 2.2 AA) */}
      <main id="main-content">
        {/* 10. Hero Header Section */}
        <section id="overview" className="relative w-full min-h-screen sm:h-screen overflow-hidden">
          {/* Seamless Canvas Boomerang Loop Background */}
          <BoomerangVideoBg
            src={BG_VIDEO}
            className="absolute inset-0 w-full h-full"
            isMirrored={false}
            isColorInverted={false}
            isClear={true}
            overlayOpacity={45}
          />

          {/* Editorial Gradients & Soft Glowing Orbs */}
          <div className="absolute inset-0 bg-gradient-to-br from-[#0f172A] via-[#1e293b] to-[#0f172A] opacity-20 pointer-events-none z-10" />
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#F97316] opacity-15 blur-[120px]" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#0f172A] opacity-25 blur-[100px]" />
          </div>

          {/* Central Display Hero Copy */}
          <div className={`relative z-10 flex flex-col items-center text-center ${showDisclaimer ? 'pt-32 sm:pt-40 md:pt-44' : 'pt-24 sm:pt-28 md:pt-32'} px-4 sm:px-6`}>
            <div className="inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-white/10 shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-extrabold text-[11px] uppercase tracking-wider">Licensed Oklahoma Wholesaler · 5.0 Star</span>
            </div>

            {/* Requirement 10: Headline */}
            <h1
              className="font-extrabold leading-[0.95] text-white text-[2.25rem] sm:text-5xl md:text-6xl lg:text-[4.75rem] xl:text-[5.5rem] tracking-[-0.04em] max-w-5xl drop-shadow"
              style={{
                fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
              }}
            >
              Oklahoma’s Wholesale{' '}
              <span className="text-[#F97316]">
                Distribution Partner
              </span>
            </h1>

            {/* Requirement 10: Supporting Text */}
            <p className="mt-6 text-white/90 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto px-2 drop-shadow-sm">
              Wholesale products, leading brands, competitive pricing, and reliable service for qualified retailers.
            </p>

            {/* Requirement 10: Central Hero Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 z-10">
              <a
                href="#inventory"
                className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs sm:text-sm font-extrabold px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 uppercase tracking-wider"
              >
                <Package className="w-4 h-4" />
                <span>Browse Products</span>
              </a>

              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="bg-white/15 hover:bg-white/25 backdrop-blur-md text-white text-xs sm:text-sm font-bold px-7 py-3.5 rounded-full border border-white/25 transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#F97316]" />
                <span>Apply for Wholesale Account</span>
              </button>

              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="bg-black/55 hover:bg-black/75 backdrop-blur-md text-white text-xs sm:text-sm font-bold px-6 py-3.5 rounded-full border border-white/20 transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 text-[#F97316]" />
                <span>Wholesale Cart</span>
                {cartUnits > 0 && (
                  <span className="bg-[#F97316] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                    {cartUnits} units
                  </span>
                )}
              </button>
            </div>

            {/* Trust Value Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-semibold text-white/80">
              <span className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                ⚡ Same-Day OKC Pickup
              </span>
              <span className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                📦 Tiered Volume Pricing
              </span>
              <span className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                🔒 Licensed Master Distributor
              </span>
              <span className="bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 flex items-center gap-1.5">
                🚚 Statewide Metro Dispatch
              </span>
            </div>
          </div>

          {/* Bottom-left customized corporate profile badge */}
          <div className="hidden xl:block absolute left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm bg-black/55 backdrop-blur-md border border-white/10 p-5 rounded-[24px] shadow-lg">
            <div className="flex items-center gap-2 text-[#F97316] mb-3">
              <Sparkles className="w-4 h-4 text-[#F97316]" />
              <span className="text-sm font-bold tracking-wide">
                Wholesale of Oklahoma
              </span>
            </div>
            <p className="text-white/85 text-xs leading-relaxed mb-6 max-w-xs font-semibold">
              Wholesale of Oklahoma supplies qualified dispensaries, vape stores, and smoke shops with direct warehouse inventory and dedicated retail service.
            </p>
            <div className="flex gap-4">
              <a
                href="#pricing"
                className="bg-[#F97316] text-white text-xs font-bold px-6 py-3.5 rounded-full shadow hover:bg-[#ea580c] transition-colors"
              >
                Directions
              </a>
              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="border border-white/20 text-white text-xs font-bold px-6 py-3.5 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
              >
                Apply for Account
              </button>
            </div>
          </div>

          {/* Dynamic dispatch info popup notification */}
          {quickContactMsg && (
            <div className="absolute right-4 bottom-20 z-50 bg-[#0f172A] text-white p-4 rounded-xl shadow-lg max-w-xs text-xs space-y-2 border border-white/10 animate-in slide-in-from-right-6 duration-300">
              <p className="font-semibold text-[#F97316]">✓ Live loading help dispatch</p>
              <p className="text-slate-300">We help stack your restocks directly into your delivery cargo vehicles on Bryant Ave!</p>
            </div>
          )}
        </section>

        {/* 11. Featured Brands Section with VOZOL Priority Placement */}
        <FeaturedBrands />

        {/* 2 & 12. Live Wholesale Inventory Section with Zoho Inventory Integration */}
        <InventorySection />

        {/* 13 & 14. Why Wholesale of Oklahoma & Wholesale Application CTA */}
        <WhyChooseUs onOpenApplication={() => setIsWholesaleModalOpen(true)} />

        {/* 2.5 Separate Premium Order Now Form with customized fields */}
        <OrderForm />

        {/* 3. Verified Maps Customer Testimonials Test Slider */}
        <ReviewSlider />

        {/* 3.5 Photo Gallery */}
        <GallerySlider />

        {/* 4. Complete contact directories with Map representation */}
        <StoreDetails />
      </main>

      {/* 22. Regulatory Warning & Comprehensive Compliance Footer */}
      <footer className="bg-[#0f172A] border-t border-slate-800 text-slate-400">
        {/* FDA / State Nicotine Regulatory Warning Banner */}
        <div className="bg-[#090d16] border-b border-slate-800 py-4 px-4 text-center">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs">
            <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Regulatory Warning
            </span>
            <p className="text-slate-300 font-semibold text-[11px] sm:text-xs leading-relaxed">
              WARNING: Products sold by Wholesale of Oklahoma contain nicotine. Nicotine is an addictive chemical. 21+ only.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-xs">
            <div className="space-y-3 md:col-span-2">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider">
                Wholesale of Oklahoma LLC
              </h4>
              <p className="text-slate-400 leading-relaxed max-w-md">
                B2B wholesale distributor serving licensed convenience stores, retail dispensaries, and smoke shops across Oklahoma. Strictly commercial wholesale accounts only. Valid Oklahoma Sales Tax Permit and Tobacco/Vapor License required.
              </p>
              <div className="flex items-center gap-2 text-[#F97316] font-bold">
                <ShieldCheck className="w-4 h-4" />
                <span>Oklahoma Master Distributor · OKC Hub</span>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Quick Navigation
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li><a href="#overview" className="hover:text-[#F97316] transition-colors">Overview</a></li>
                <li><a href="#brands" className="hover:text-[#F97316] transition-colors">Featured Brands</a></li>
                <li><a href="#inventory" className="hover:text-[#F97316] transition-colors">Products Catalog</a></li>
                <li><a href="#why-us" className="hover:text-[#F97316] transition-colors">Why Wholesale OK</a></li>
                <li><a href="#direct-order-section" className="hover:text-[#F97316] transition-colors">Order Now</a></li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Warehouse & Dispatch
              </h4>
              <p className="text-slate-400">4500 S Bryant Ave, Oklahoma City, OK 73135</p>
              <p className="text-slate-300 font-bold">Phone: (405) 768-2975</p>
              <p className="text-slate-400">Mon–Sat: 9:00 AM – 8:00 PM</p>
              <p className="text-slate-400">Sun: 11:00 AM – 8:00 PM</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
            <p>© 2026 Wholesale of Oklahoma™ LLC. All Rights Reserved. Oklahoma Business Entity.</p>
            <div className="flex items-center gap-4">
              <span>Strictly 21+ B2B Retail Partners</span>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="hover:text-[#F97316] transition-colors cursor-pointer"
              >
                Apply for Wholesale Account
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="hover:text-[#F97316] transition-colors cursor-pointer"
              >
                Portal Login
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Persistent Sticky Floating Cart Button */}
      <div className="fixed bottom-20 sm:bottom-24 right-6 z-40">
        <button
          id="floating-cart-trigger"
          onClick={() => setIsCartOpen(true)}
          aria-label={`Open Wholesale Cart (${cartUnits} units)`}
          className={`group relative flex items-center gap-2.5 bg-[#0f172A] hover:bg-[#1e293b] text-white px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl border border-[#F97316]/40 transition-all duration-300 cursor-pointer select-none hover:scale-105 active:scale-95 ${
            cartUnits > 0 ? 'ring-2 ring-[#F97316]/60 shadow-orange-950/40' : ''
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#F97316]/20 flex items-center justify-center text-[#F97316] border border-[#F97316]/30 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            {cartUnits > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#F97316] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartUnits}
              </span>
            )}
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-white flex items-center gap-1">
              <span>Wholesale Cart</span>
            </div>
            <div className="text-[10px] text-[#F97316] font-medium">
              {cartUnits > 0 ? `${cartUnits} unit${cartUnits !== 1 ? 's' : ''} ready` : '0 items'}
            </div>
          </div>

          {cartUnits > 0 && (
            <span className="sm:hidden text-xs font-bold text-[#F97316] pr-0.5">
              {cartUnits}
            </span>
          )}
        </button>
      </div>

      {/* Floating Bottom Wholesale Order Bar */}
      {cartUnits > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4 flex justify-center">
          <div className="bg-[#0f172A]/95 backdrop-blur-xl border border-[#F97316]/40 shadow-2xl rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4 max-w-xl w-full pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#F97316]/20 flex items-center justify-center text-[#F97316] shrink-0 shadow-sm border border-[#F97316]/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                  <span>Wholesale Order Draft</span>
                  <span className="bg-[#F97316] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    {cartUnits} units
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 truncate">
                  Ready to send to dispatch for volume tiered quote
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>Review & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Wholesale Cart Drawer on Webpage */}
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />

      {/* Wholesale Account Verification & Application Modal */}
      <WholesaleApplicationModal
        isOpen={isWholesaleModalOpen}
        onClose={() => setIsWholesaleModalOpen(false)}
      />

      {/* B2B Client Portal Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onOpenApplication={() => {
          setIsLoginModalOpen(false);
          setIsWholesaleModalOpen(true);
        }}
        onLoginSuccess={() => {
          fetchCurrentUser();
        }}
      />

      {/* Mango AI Virtual Assistant — Wholesale of Oklahoma */}
      <MangoChat />
    </div>
  );
}
