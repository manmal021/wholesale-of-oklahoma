import { useState, useEffect, useCallback } from 'react';
import {
  LogIn,
  LogOut,
  UserPlus,
  Sparkles,
  Menu,
  X,
  Star,
  Phone,
  ShoppingBag,
  Package,
  ArrowRight,
  AlertTriangle,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Clock,
  Layers,
  ExternalLink,
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
import BrandDirectoryShowcase from './components/BrandDirectoryShowcase';
import CategoryShowcase from './components/CategoryShowcase';
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
  const [activeBrandFilter, setActiveBrandFilter] = useState<string>('All');

  const handleBrandClick = (brandName: string) => {
    setActiveBrandFilter(brandName);
    window.dispatchEvent(new CustomEvent('woo-select-brand', { detail: brandName }));
    const inventorySection = document.getElementById('inventory');
    if (inventorySection) {
      inventorySection.scrollIntoView({ behavior: 'smooth' });
    } else {
      setIsLoginModalOpen(true);
    }
  };

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
      const token = typeof window !== 'undefined' ? localStorage.getItem('woo_session_token') : null;
      const headers: Record<string, string> = { Accept: 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-session-token'] = token;
      }
      const res = await fetch('/api/auth/me', { credentials: 'include', headers });
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
    try {
      localStorage.removeItem('woo_session_token');
      localStorage.removeItem('woo_user');
    } catch (_) {}
    setCurrentUser(null);
    window.dispatchEvent(new CustomEvent('woo-auth-changed'));
    window.location.reload();
  };

  const navLinks = [
    { href: '#overview', label: 'Overview' },
    { href: '#brands', label: 'Brands' },
    { href: '#categories', label: 'Categories' },
    { href: currentUser ? '#inventory' : '#retailer-gateway', label: currentUser ? 'Products (900+)' : 'Retailer Portal' },
    { href: '#why-us', label: 'Why Us' },
    { href: '#reviews', label: 'Reviews' },
    { href: '#gallery', label: 'Gallery' },
    { href: '#direct-order-section', label: 'Order Now' },
    { href: '#pricing', label: 'Contact' },
  ];

  return (
    <div className="w-full min-h-screen bg-[#0B0D10] text-[#F7F7F5] selection:bg-[#FF6B00]/30 selection:text-white relative font-sans">
      {/* 21+ Age Gate Modal (Regulatory Compliance) */}
      <AgeGateModal />

      {/* WCAG 2.2 AA Skip Navigation Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2.5 focus:bg-[#FF6B00] focus:text-white focus:font-bold focus:rounded-lg focus:shadow-2xl focus:outline-none"
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
            className="w-full bg-[#0B0D10] border-b-2 border-[#FF6B00] text-[#F7F7F5] px-4 sm:px-8 py-3 sm:py-3.5 shadow-2xl flex items-center justify-center gap-2.5 sm:gap-3.5 text-center"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#FF6B00] text-white text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-md shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
              Notice
            </span>
            <p className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-[#F7F7F5] drop-shadow">
              Website under construction. Prices may not accurately reflect the original price.
            </p>
          </aside>
        )}

        {/* Responsive Sticky Glass Navbar */}
        <nav
          className={`w-full flex items-center justify-between px-4 sm:px-6 md:px-10 transition-all duration-300 ${
            scrolled
              ? 'bg-[#0B0D10]/95 backdrop-blur-md py-3 shadow-xl border-b border-[#2A3038]'
              : 'bg-transparent py-4 sm:py-6'
          }`}
        >
          <div className="flex items-center gap-2">
            <a
              href="#overview"
              className="text-xl sm:text-2xl font-black tracking-tight text-[#F7F7F5] flex items-center gap-2 select-none hover:text-[#FF6B00] transition-colors"
            >
              <span>Wholesale of Oklahoma</span>
            </a>
          </div>

          {/* Desktop Central Navigation Pill */}
          <div className="hidden lg:flex items-center gap-1 bg-[#15191F]/90 backdrop-blur-md rounded-full pl-6 pr-2 py-1 shadow-md border border-[#2A3038]">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-2 font-semibold text-[#B8BDC5] hover:text-[#FF6B00] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#direct-order-section"
              className="ml-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold px-4 py-2 rounded-full transition-colors uppercase tracking-wider shadow"
            >
              Order Now
            </a>

            {/* Auth-Aware Desktop Buttons */}
            {currentUser ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-[#2A3038]">
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
                      <ShieldCheck className="w-3 h-3 text-[#FF6B00]" />
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
                  className="text-xs font-semibold text-[#858C96] hover:text-[#F7F7F5] px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                  title="Logout from wholesale portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-[#2A3038]">
                <button
                  type="button"
                  onClick={() => setIsWholesaleModalOpen(true)}
                  className="text-xs font-bold text-[#B8BDC5] hover:text-[#FF6B00] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-xs font-bold text-[#F7F7F5] bg-[#1B2027] hover:bg-[#2A3038] px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border border-[#2A3038] flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF6B00]" />
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
              className="flex items-center gap-2 text-xs font-bold text-[#F7F7F5] hover:text-[#FF6B00] transition-colors cursor-pointer bg-[#15191F]/80 backdrop-blur-sm px-3.5 py-2 rounded-full border border-[#2A3038] shadow-sm hover:bg-[#1B2027]"
              aria-label={`Open Cart (${cartUnits} units)`}
            >
              <ShoppingBag className="w-4 h-4 text-[#FF6B00]" />
              <span className="hidden sm:inline">Cart</span>
              {cartUnits > 0 && (
                <span className="bg-[#FF6B00] text-white text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {cartUnits}
                </span>
              )}
            </button>

            <a
              href="tel:4057682975"
              className="hidden sm:flex items-center gap-1.5 text-xs font-extrabold text-[#FF6B00] hover:text-[#F7F7F5] transition-colors cursor-pointer bg-[#15191F]/80 backdrop-blur-sm px-4 py-2 rounded-full border border-[#2A3038]"
            >
              <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
              (405) 768-2975
            </a>

            {/* Mobile Menu Toggler Button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-[#15191F]/90 backdrop-blur-md border border-[#2A3038] text-[#F7F7F5] transition-all duration-300 hover:bg-[#1B2027]"
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
        <div className="absolute inset-0 bg-[#0B0D10]/80 backdrop-blur-sm" />
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-[#15191F] border-l border-[#2A3038] text-[#F7F7F5] shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-8 pb-8">
          <div className="flex items-center justify-between pb-4 border-b border-[#2A3038] mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF6B00]">
              Navigation Links
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 rounded-full bg-[#1B2027] border border-[#2A3038] flex items-center justify-center text-[#B8BDC5] hover:text-[#F7F7F5] cursor-pointer"
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
                className={`text-lg font-semibold text-[#F7F7F5] py-2.5 border-b border-[#2A3038] transition-all duration-500 hover:text-[#FF6B00] ${
                  menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`}
                style={{ transitionDelay: menuOpen ? `${150 + i * 40}ms` : '0ms' }}
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
              className="w-full text-left text-lg font-semibold text-[#F7F7F5] py-3 border-b border-[#2A3038] flex items-center justify-between transition-colors hover:text-[#FF6B00]"
            >
              <span className="flex items-center gap-2.5">
                <ShoppingBag className="w-5 h-5 text-[#FF6B00]" />
                Wholesale Cart
              </span>
              {cartUnits > 0 && (
                <span className="bg-[#FF6B00] text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                  {cartUnits} units
                </span>
              )}
            </button>

            {/* Auth Actions in Mobile Menu */}
            {currentUser ? (
              <div className="mt-3 p-3 bg-[#1B2027] rounded-xl border border-[#2A3038] space-y-2">
                <div className="text-xs text-[#B8BDC5]">
                  Logged in as: <strong className="text-[#F7F7F5]">{currentUser.email}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Role: {currentUser.role.replace('_', ' ')}
                  </span>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="text-xs text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
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
                  className="py-2.5 bg-[#1B2027] hover:bg-[#2A3038] text-[#F7F7F5] border border-[#2A3038] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Login
                </button>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    setIsWholesaleModalOpen(true);
                  }}
                  className="py-2.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
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
            style={{ transitionDelay: menuOpen ? '350ms' : '0ms' }}
          >
            <div className="bg-[#1B2027] p-3 rounded-xl space-y-1 text-xs border border-[#2A3038]">
              <p className="font-semibold text-[#F7F7F5]">Central OKC Warehouse:</p>
              <p className="text-[#858C96]">4500 S Bryant Ave, OKC, OK 73135</p>
              <p className="text-[#FF6B00] font-semibold">(405) 768-2975 · Mon–Sat 9AM–8PM</p>
            </div>

            <button
              onClick={() => {
                setMenuOpen(false);
                window.location.href = 'tel:4057682975';
              }}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-semibold px-4 py-2.5 rounded-full transition-colors flex items-center justify-center gap-2 shadow"
            >
              <Phone className="w-3.5 h-3.5 text-white" />
              Call Live Dispatcher
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Landmark (WCAG 2.2 AA) */}
      <main id="main-content">
        {/* 1. Hero Header Section */}
        <section id="overview" className="relative w-full min-h-screen sm:h-screen overflow-hidden bg-[#0B0D10]">
          {/* Seamless Canvas Boomerang Loop Background */}
          <BoomerangVideoBg
            src={BG_VIDEO}
            className="absolute inset-0 w-full h-full"
            isMirrored={false}
            isColorInverted={false}
            isClear={true}
            overlayOpacity={60}
          />

          {/* Editorial Dark Gradients & Soft Glowing Orbs */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0D10]/80 via-[#0B0D10]/60 to-[#0B0D10] pointer-events-none z-10" />
          <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
            <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#FF6B00] opacity-10 blur-[140px]" />
            <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#FF6B00] opacity-10 blur-[120px]" />
          </div>

          {/* Central Display Hero Copy */}
          <div className={`relative z-10 flex flex-col items-center text-center ${showDisclaimer ? 'pt-32 sm:pt-40 md:pt-44' : 'pt-24 sm:pt-28 md:pt-32'} px-4 sm:px-6`}>
            <div className="inline-flex items-center gap-1.5 bg-[#15191F]/90 backdrop-blur-md text-[#F7F7F5] text-xs font-semibold px-4 py-1.5 rounded-full mb-6 border border-[#2A3038] shadow-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-extrabold text-[11px] uppercase tracking-wider text-[#FF6B00]">Licensed Oklahoma Wholesaler · 5.0 Star</span>
            </div>

            {/* Headline */}
            <h1
              className="font-extrabold leading-[0.95] text-[#F7F7F5] text-[2.25rem] sm:text-5xl md:text-6xl lg:text-[4.75rem] xl:text-[5.5rem] tracking-[-0.04em] max-w-5xl drop-shadow"
              style={{
                fontFamily: '"Plus Jakarta Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              }}
            >
              Oklahoma’s Wholesale{' '}
              <span className="text-[#FF6B00]">
                Distribution Partner
              </span>
            </h1>

            {/* Supporting Text */}
            <p className="mt-6 text-[#B8BDC5] text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-2xl mx-auto px-2 drop-shadow-sm">
              Leading brands, competitive wholesale pricing, and reliable service for qualified retailers.
            </p>

            {/* Central Hero Action Buttons */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 z-10">
              <a
                href="#brands"
                className="bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs sm:text-sm font-extrabold px-7 py-3.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 uppercase tracking-wider"
              >
                <Layers className="w-4 h-4" />
                <span>Explore Brands Portfolio</span>
              </a>

              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="bg-[#15191F] hover:bg-[#1B2027] text-[#F7F7F5] text-xs sm:text-sm font-bold px-7 py-3.5 rounded-full border border-[#2A3038] transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#FF6B00]" />
                <span>Apply for Wholesale Account</span>
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="bg-[#15191F] hover:bg-[#1B2027] text-[#F7F7F5] text-xs sm:text-sm font-bold px-6 py-3.5 rounded-full border border-[#2A3038] transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4 text-[#FF6B00]" />
                  <span>Wholesale Cart</span>
                  {cartUnits > 0 && (
                    <span className="bg-[#FF6B00] text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {cartUnits}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-[#15191F] hover:bg-[#1B2027] text-[#F7F7F5] text-xs sm:text-sm font-bold px-6 py-3.5 rounded-full border border-[#2A3038] transition-all duration-300 shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-[#FF6B00]" />
                  <span>Customer Login</span>
                </button>
              )}
            </div>

            {/* Trust Value Badges */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-[11px] font-semibold text-[#B8BDC5]">
              <span className="bg-[#15191F]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2A3038] flex items-center gap-1.5">
                ⚡ Same-Day OKC Pickup
              </span>
              <span className="bg-[#15191F]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2A3038] flex items-center gap-1.5">
                📦 Tiered Volume Pricing
              </span>
              <span className="bg-[#15191F]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2A3038] flex items-center gap-1.5">
                🔒 Licensed Master Distributor
              </span>
              <span className="bg-[#15191F]/90 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-[#2A3038] flex items-center gap-1.5">
                🚚 Statewide Metro Dispatch
              </span>
            </div>
          </div>

          {/* Bottom-left corporate profile badge */}
          <div className="hidden xl:block absolute left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm bg-[#15191F]/90 backdrop-blur-md border border-[#2A3038] p-5 rounded-[24px] shadow-lg">
            <div className="flex items-center gap-2 text-[#FF6B00] mb-3">
              <Sparkles className="w-4 h-4 text-[#FF6B00]" />
              <span className="text-sm font-bold tracking-wide">
                Wholesale of Oklahoma
              </span>
            </div>
            <p className="text-[#B8BDC5] text-xs leading-relaxed mb-5 max-w-xs font-medium">
              Wholesale of Oklahoma supplies qualified dispensaries, vape stores, and smoke shops with direct warehouse inventory and dedicated retail service.
            </p>
            <div className="flex gap-3">
              <a
                href="#pricing"
                className="bg-[#FF6B00] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow hover:bg-[#E85F00] transition-colors"
              >
                Directions
              </a>
              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="border border-[#2A3038] text-[#F7F7F5] text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#1B2027] transition-colors cursor-pointer"
              >
                Apply for Account
              </button>
            </div>
          </div>
        </section>

        {/* 2. Official Wholesale Brands Showcase with Hardware & Packaging Images */}
        <BrandDirectoryShowcase
          isLoggedIn={Boolean(currentUser)}
          onBrandClick={handleBrandClick}
          onOpenLogin={() => setIsLoginModalOpen(true)}
          onOpenApplication={() => setIsWholesaleModalOpen(true)}
        />

        {/* 3. Dynamic Category Showcase Section */}
        <CategoryShowcase />

        {/* 4. Inside the Login Gateway: Display all 900+ Products Imported from Zoho with Pricing */}
        {currentUser ? (
          <div id="inventory" className="relative">
            <div className="bg-gradient-to-r from-[#FF6B00]/15 via-[#15191F] to-[#15191F] border-y border-[#FF6B00]/40 py-4 px-4 shadow-inner">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#FF6B00] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">
                    Verified B2B Retailer
                  </span>
                  <span className="text-sm font-bold text-[#F7F7F5]">
                    {currentUser.businessName || currentUser.contactName || currentUser.email}
                  </span>
                  <span className="hidden md:inline text-xs text-[#858C96]">
                    · Live Wholesale Tier Pricing & Case Stock Active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-400 font-semibold flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    900+ Zoho SKUs Connected
                  </span>
                </div>
              </div>
            </div>
            <InventorySection initialBrand={activeBrandFilter} />
          </div>
        ) : (
          <div id="retailer-gateway" className="py-14 bg-[#0B0D10] text-center border-t border-[#2A3038]/60">
            <div className="max-w-4xl mx-auto px-4 space-y-4">
              <div className="inline-flex items-center gap-2 bg-[#15191F] text-[#FF6B00] border border-[#2A3038] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full">
                <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                <span>Oklahoma Closed Wholesale Network</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-[#F7F7F5]">
                Login to Access Full 900+ Zoho Inventory Catalog & Wholesale Rates
              </h3>
              <p className="text-sm text-[#858C96] max-w-xl mx-auto leading-relaxed">
                In compliance with Oklahoma wholesale distribution regulations, catalog browsing with tiered case pricing and direct ordering is unlocked inside the retailer gateway for verified partners.
              </p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-extrabold text-xs sm:text-sm px-8 py-4 rounded-full transition-all shadow-lg hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Retailer Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWholesaleModalOpen(true)}
                  className="bg-[#15191F] hover:bg-[#1B2027] text-[#F7F7F5] border border-[#2A3038] hover:border-[#FF6B00] font-bold text-xs sm:text-sm px-7 py-3.5 rounded-full transition-all flex items-center gap-2 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4 text-[#FF6B00]" />
                  <span>Register Wholesale Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5 & 6. Why Wholesale of Oklahoma & Ready to Buy Wholesale CTA */}
        <WhyChooseUs onOpenApplication={() => setIsWholesaleModalOpen(true)} />

        {/* 7. Separate Direct Restock Order Request Form */}
        <OrderForm />

        {/* 8. Verified Customer Reviews Slider */}
        <ReviewSlider />

        {/* 9. Warehouse Photo Gallery */}
        <GallerySlider />

        {/* 10. Complete Contact Directories with Map representation */}
        <StoreDetails />
      </main>

      {/* Regulatory Warning & Comprehensive Compliance Footer */}
      <footer className="bg-[#0B0D10] border-t border-[#2A3038] text-[#858C96]">
        {/* FDA / State Nicotine Regulatory Warning Banner */}
        <div className="bg-[#15191F] border-b border-[#2A3038] py-4 px-4 text-center">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs">
            <span className="bg-rose-500/15 text-rose-400 border border-rose-500/30 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Regulatory Warning
            </span>
            <p className="text-[#B8BDC5] font-semibold text-[11px] sm:text-xs leading-relaxed">
              WARNING: Products sold by Wholesale of Oklahoma contain nicotine. Nicotine is an addictive chemical. 21+ only.
            </p>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 space-y-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-8 text-xs">
            {/* Col 1: Wholesale of Oklahoma Hub */}
            <div className="space-y-3.5 sm:col-span-2 lg:col-span-1">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-[#FF6B00] flex items-center justify-center text-white font-black text-xs">
                  W
                </span>
                <h4 className="text-sm font-black text-[#F7F7F5] uppercase tracking-wider">
                  Wholesale of OK
                </h4>
              </div>
              <p className="text-[#858C96] leading-relaxed">
                Premier Oklahoma B2B master distributor supplying verified dispensaries, smoke shops, and convenience stores with direct manufacturer inventory.
              </p>
              <div className="space-y-1.5 pt-1 text-[#B8BDC5]">
                <p className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                  <span className="font-semibold text-[#F7F7F5]">Oklahoma Licensed Wholesaler</span>
                </p>
                <p className="text-[11px] text-[#858C96]">
                  4500 S Bryant Ave, OKC, OK 73135
                </p>
                <p className="text-[11px] text-[#FF6B00] font-bold">
                  (405) 768-2975
                </p>
                <p className="text-[10px] text-[#858C96]">
                  Mon–Sat: 9AM–8PM · Sun: 11AM–8PM
                </p>
              </div>
            </div>

            {/* Col 2: Brand Directory */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#F7F7F5] uppercase tracking-widest text-[#FF6B00]">
                Brand Directory
              </h4>
              <ul className="space-y-1.5 text-[#858C96]">
                {[
                  'Geekbar',
                  'Raz',
                  'Vozol',
                  'Foger',
                  'Vaporesso',
                  'SMOK',
                  'Yocan',
                  'Juice Head',
                  'Coastal Clouds',
                  'OPMS',
                  'RAW',
                ].map((brand) => (
                  <li key={brand}>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('woo-select-brand', { detail: brand }));
                        const el = document.getElementById('inventory');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-[#FF6B00] transition-colors cursor-pointer text-left font-medium"
                    >
                      {brand}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 3: Category Directory */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#F7F7F5] uppercase tracking-widest text-[#FF6B00]">
                Categories
              </h4>
              <ul className="space-y-1.5 text-[#858C96]">
                {[
                  { label: 'Disposable Vapes', id: 'Disposable Vapes' },
                  { label: 'Vape Mods & Kits', id: 'Vape Mods & Kits' },
                  { label: 'Vape Juices & Salts', id: 'Vape Juice' },
                  { label: 'Pipes & Glassware', id: 'Pipes & Glass' },
                  { label: 'THCA & Hemp', id: 'THCA, CBD & Delta' },
                  { label: 'Premium Kratom', id: 'Kratom' },
                  { label: 'Rolling Papers & Cones', id: 'Accessories' },
                  { label: 'Smoke Shop Novelties', id: 'Novelties' },
                ].map((cat) => (
                  <li key={cat.id}>
                    <button
                      type="button"
                      onClick={() => {
                        window.dispatchEvent(new CustomEvent('woo-select-category', { detail: cat.id }));
                        const el = document.getElementById('inventory');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="hover:text-[#FF6B00] transition-colors cursor-pointer text-left font-medium"
                    >
                      {cat.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Col 4: Retailer Portals & Orders */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#F7F7F5] uppercase tracking-widest text-[#FF6B00]">
                Retailer Tools
              </h4>
              <ul className="space-y-1.5 text-[#858C96]">
                <li>
                  <a href="#inventory" className="hover:text-[#FF6B00] transition-colors">
                    Wholesale Catalog
                  </a>
                </li>
                <li>
                  <a href="#direct-order-section" className="hover:text-[#FF6B00] transition-colors">
                    Direct Order Form
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(true)}
                    className="hover:text-[#FF6B00] transition-colors cursor-pointer text-left"
                  >
                    Wholesale Cart ({cartUnits})
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsWholesaleModalOpen(true)}
                    className="hover:text-[#FF6B00] transition-colors cursor-pointer text-left"
                  >
                    Apply for Wholesale
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="hover:text-[#FF6B00] transition-colors cursor-pointer text-left"
                  >
                    Retailer Portal Login
                  </button>
                </li>
                <li>
                  <a href="#why-us" className="hover:text-[#FF6B00] transition-colors">
                    Why Wholesale of OK
                  </a>
                </li>
                <li>
                  <a href="#overview" className="hover:text-[#FF6B00] transition-colors">
                    OKC Warehouse Hub
                  </a>
                </li>
                <li>
                  <a href="tel:4057682975" className="hover:text-[#FF6B00] transition-colors font-semibold text-[#F7F7F5]">
                    Dispatch: (405) 768-2975
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 5: Sitemap & Compliance */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-[#F7F7F5] uppercase tracking-widest text-[#FF6B00]">
                Sitemap & Legal
              </h4>
              <ul className="space-y-1.5 text-[#858C96]">
                <li>
                  <a
                    href="/sitemap.xml"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#FF6B00] transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <span>XML Sitemap</span>
                    <ExternalLink className="w-3 h-3 text-[#FF6B00]" />
                  </a>
                </li>
                <li>
                  <a
                    href="/robots.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[#FF6B00] transition-colors flex items-center gap-1.5 font-medium"
                  >
                    <span>Robots.txt</span>
                    <ExternalLink className="w-3 h-3 text-[#FF6B00]" />
                  </a>
                </li>
                <li>
                  <span className="text-[#858C96] hover:text-[#F7F7F5] cursor-default">
                    Oklahoma 21+ Age Verification
                  </span>
                </li>
                <li>
                  <span className="text-[#858C96] hover:text-[#F7F7F5] cursor-default">
                    Wholesale Terms of Service
                  </span>
                </li>
                <li>
                  <span className="text-[#858C96] hover:text-[#F7F7F5] cursor-default">
                    Privacy Policy & Data Rights
                  </span>
                </li>
                <li>
                  <span className="text-[#858C96] hover:text-[#F7F7F5] cursor-default">
                    Oklahoma Tax Permit (Form OK-500)
                  </span>
                </li>
                <li>
                  <span className="text-[#858C96] hover:text-[#F7F7F5] cursor-default">
                    PACT Act Compliance
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#2A3038] flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-[#858C96]">
            <p>© 2026 Wholesale of Oklahoma™ LLC. All Rights Reserved. Oklahoma Business Entity.</p>
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <span className="text-[#FF6B00] font-bold">Strictly 21+ B2B Retail Partners</span>
              <span>•</span>
              <a href="/sitemap.xml" target="_blank" rel="noopener noreferrer" className="hover:text-[#FF6B00] transition-colors">
                Sitemap
              </a>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="hover:text-[#FF6B00] transition-colors cursor-pointer"
              >
                Apply for Wholesale Account
              </button>
              <span>•</span>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(true)}
                className="hover:text-[#FF6B00] transition-colors cursor-pointer"
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
          className={`group relative flex items-center gap-2.5 bg-[#15191F] hover:bg-[#1B2027] text-[#F7F7F5] px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-2xl border border-[#FF6B00]/40 transition-all duration-300 cursor-pointer select-none hover:scale-105 active:scale-95 ${
            cartUnits > 0 ? 'ring-2 ring-[#FF6B00]/60' : ''
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            {cartUnits > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B00] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartUnits}
              </span>
            )}
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-[#F7F7F5] flex items-center gap-1">
              <span>Wholesale Cart</span>
            </div>
            <div className="text-[10px] text-[#FF6B00] font-medium">
              {cartUnits > 0 ? `${cartUnits} unit${cartUnits !== 1 ? 's' : ''} ready` : '0 items'}
            </div>
          </div>

          {cartUnits > 0 && (
            <span className="sm:hidden text-xs font-bold text-[#FF6B00] pr-0.5">
              {cartUnits}
            </span>
          )}
        </button>
      </div>

      {/* Floating Bottom Wholesale Order Bar */}
      {cartUnits > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none p-3 sm:p-4 flex justify-center">
          <div className="bg-[#15191F]/95 backdrop-blur-xl border border-[#FF6B00]/40 shadow-2xl rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4 max-w-xl w-full pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00]/20 flex items-center justify-center text-[#FF6B00] shrink-0 shadow-sm border border-[#FF6B00]/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#F7F7F5] flex items-center gap-1.5 truncate">
                  <span>Wholesale Order Draft</span>
                  <span className="bg-[#FF6B00] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    {cartUnits} units
                  </span>
                </div>
                <div className="text-[10px] text-[#858C96] truncate">
                  Ready to send to dispatch for volume tiered quote
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setIsCartOpen(true)}
                className="bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold px-4 py-2 rounded-full transition-all shadow hover:scale-105 active:scale-95 flex items-center gap-1 cursor-pointer"
              >
                <span>Review & Submit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standalone Wholesale Cart Drawer */}
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
