import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
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
import AdminLogin from './components/admin/AdminLogin';
import AdminActivation from './components/admin/AdminActivation';
import AdminResetPassword from './components/admin/AdminResetPassword';
import AdminDashboard from './components/admin/AdminDashboard';
import AdminApplicationsList from './components/admin/AdminApplicationsList';
import AdminApplicationDetail from './components/admin/AdminApplicationDetail';
import AdminCustomersList from './components/admin/AdminCustomersList';
import AdminOrdersList from './components/admin/AdminOrdersList';
import AdminOrderDetail from './components/admin/AdminOrderDetail';
import AdminInventoryMismatches from './components/admin/AdminInventoryMismatches';
import AdminProductsAvailability from './components/admin/AdminProductsAvailability';
import AdminReviewPortal from './components/admin/AdminReviewPortal';
import AccountActivation from './components/customer/AccountActivation';
import CustomerAccountPage from './components/customer/CustomerAccountPage';
import CustomerPortal from './components/customer/CustomerPortal';
import PasswordResetPage from './components/customer/PasswordResetPage';
import ThemeToggle from './components/ThemeToggle';
import ProductSpotlight from './components/ProductSpotlight';
import BrandMarquee from './components/BrandMarquee';
import { useTheme } from './lib/useTheme';
import { initTheme } from './lib/theme';
import { animate, stagger, createTimeline, onScroll } from 'animejs';

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

function AdminRouteGuard({ children }: { children: ReactNode }) {
  const [isVerifying, setIsVerifying] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(() => {
    try {
      const token = localStorage.getItem('woo_session_token');
      const rawUser = localStorage.getItem('woo_user');
      if (token && rawUser) {
        const u = JSON.parse(rawUser);
        return u.role === 'admin';
      }
    } catch (_) {}
    return false;
  });

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem('woo_session_token');
    const headers: Record<string, string> = token ? { 'x-session-token': token } : {};

    fetch('/api/auth/me', { headers })
      .then((res) => res.json())
      .then((data) => {
        if (!active) return;
        if (data.authenticated && data.user?.role === 'admin') {
          setIsAuthorized(true);
          setIsVerifying(false);
        } else {
          try {
            localStorage.removeItem('woo_session_token');
            localStorage.removeItem('woo_user');
          } catch (_) {}
          window.location.replace('/admin/login');
        }
      })
      .catch(() => {
        if (!active) return;
        if (isAuthorized) {
          setIsVerifying(false);
        } else {
          window.location.replace('/admin/login');
        }
      });

    return () => {
      active = false;
    };
  }, []);

  if (isVerifying && !isAuthorized) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center text-slate-500">
        <div className="w-10 h-10 border-4 border-[#FF6B00] border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600">Verifying Administrator Privileges...</p>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App() {
  useEffect(() => {
    initTheme();
  }, []);

  const { theme, isDark } = useTheme();
  const pathname = typeof window !== 'undefined' ? window.location.pathname.toLowerCase().replace(/\/$/, '') || '/' : '/';

  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      return <AdminLogin />;
    }
    if (pathname === '/admin/activate') {
      return <AdminActivation />;
    }
    if (pathname === '/admin/reset-password') {
      return <AdminResetPassword />;
    }

    if (pathname.startsWith('/admin/orders/')) {
      const rawId = window.location.pathname.replace(/^\/admin\/orders\//i, '').replace(/\/$/, '').trim();
      return (
        <AdminRouteGuard>
          <AdminOrderDetail orderId={rawId} />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/orders') {
      return (
        <AdminRouteGuard>
          <AdminOrdersList />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/products' || pathname === '/admin/products/availability') {
      return (
        <AdminRouteGuard>
          <AdminProductsAvailability />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/inventory-mismatches') {
      return (
        <AdminRouteGuard>
          <AdminInventoryMismatches />
        </AdminRouteGuard>
      );
    }
    if (pathname.startsWith('/admin/customer-applications/') || pathname.startsWith('/admin/applications/')) {
      const rawId = window.location.pathname
        .replace(/^\/admin\/(customer-applications|applications)\//i, '')
        .replace(/\/$/, '')
        .trim();
      return (
        <AdminRouteGuard>
          <AdminApplicationDetail applicationId={rawId} />
        </AdminRouteGuard>
      );
    }
    if (pathname.startsWith('/admin/customers/')) {
      const rawId = window.location.pathname.replace(/^\/admin\/customers\//i, '').replace(/\/$/, '').trim();
      return (
        <AdminRouteGuard>
          <AdminApplicationDetail applicationId={rawId} />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/customer-applications' || pathname === '/admin/applications') {
      return (
        <AdminRouteGuard>
          <AdminApplicationsList />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/customers') {
      return (
        <AdminRouteGuard>
          <AdminCustomersList />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin' || pathname === '/admin/dashboard') {
      return (
        <AdminRouteGuard>
          <AdminDashboard />
        </AdminRouteGuard>
      );
    }
    if (pathname === '/admin/review') {
      return (
        <AdminRouteGuard>
          <AdminReviewPortal />
        </AdminRouteGuard>
      );
    }
  }
  if (pathname === '/activate') {
    return <AccountActivation />;
  }
  if (pathname === '/portal') {
    return <CustomerPortal />;
  }
  if (pathname === '/account' || pathname === '/account/orders' || pathname === '/account/addresses') {
    return <CustomerAccountPage />;
  }
  if (pathname === '/reset-password') {
    return <PasswordResetPage />;
  }

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

  // Hero entrance timeline — fires once on first load
  useEffect(() => {
    const tl = createTimeline({ defaults: { ease: 'outExpo' } });
    tl
      .add('.hero-badge-enter',    { opacity: [0, 1], translateY: [-12, 0], duration: 600 }, 200)
      .add('.hero-title-enter',    { opacity: [0, 1], translateY: [32, 0],  duration: 800 }, 350)
      .add('.hero-sub-enter',      { opacity: [0, 1], translateY: [20, 0],  duration: 600 }, 600)
      .add('.hero-cta-enter > *',  { opacity: [0, 1], translateY: [16, 0],  duration: 500, delay: stagger(80) }, 800)
      .add('.hero-trust-enter > *',{ opacity: [0, 1], translateY: [14, 0],  duration: 500, delay: stagger(60) }, 950)
      .add('.hero-card-enter',     { opacity: [0, 1], translateY: [20, 0],  duration: 600, delay: stagger(120) }, 1050);
    return () => { tl.cancel?.(); };
  }, []);

  // Scroll-triggered section entrances via anime.js onScroll
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.anim-hidden, .anim-hidden-left, .anim-hidden-right, .anim-hidden-scale'));
    if (!els.length) return;
    els.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = el.classList.contains('anim-hidden-left')  ? 'translateX(-30px)'
                         : el.classList.contains('anim-hidden-right') ? 'translateX(30px)'
                         : el.classList.contains('anim-hidden-scale') ? 'scale(0.92)'
                         : 'translateY(28px)';
    });
    const cleanups = els.map((el) =>
      onScroll({
        target: el,
        enter: 'top 92%',
        onEnter: () => animate(el, {
          opacity: [0, 1],
          translateY: el.classList.contains('anim-hidden') ? [28, 0] : undefined,
          translateX: el.classList.contains('anim-hidden-left')  ? [-30, 0]
                    : el.classList.contains('anim-hidden-right') ? [30, 0]  : undefined,
          scale: el.classList.contains('anim-hidden-scale') ? [0.92, 1] : undefined,
          duration: 750,
          ease: 'outExpo',
        }),
      })
    );
    return () => { cleanups.forEach((c) => { if (typeof (c as any)?.revert === 'function') (c as any).revert(); }); };
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
    <div className="w-full min-h-screen bg-[#F8FAFC] dark:bg-[#0A0E17] text-[#0F172A] dark:text-[#F8FAFC] selection:bg-[#FF6B00]/30 selection:text-white relative font-sans transition-colors duration-200">
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
            className="w-full bg-amber-50 dark:bg-amber-950/40 border-b-2 border-amber-300 dark:border-amber-700/60 text-amber-950 dark:text-amber-200 px-4 sm:px-8 py-3 sm:py-3.5 shadow-sm flex items-center justify-center gap-2.5 sm:gap-3.5 text-center transition-colors"
          >
            <span className="inline-flex items-center gap-1.5 bg-[#FF6B00] text-white text-xs sm:text-sm font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm shrink-0">
              <AlertTriangle className="w-4 h-4 text-white" />
              Notice
            </span>
            <p className="text-sm sm:text-base md:text-lg font-bold tracking-wide text-amber-950 dark:text-amber-100">
              Website under construction. Prices may not accurately reflect the original price.
            </p>
          </aside>
        )}

        {/* Responsive Sticky Glass Navbar */}
        <nav
          className={`w-full flex items-center justify-between px-4 sm:px-6 md:px-10 transition-all duration-300 ${
            scrolled
              ? 'bg-white/95 dark:bg-[#0B0F17]/95 backdrop-blur-md py-3 shadow-sm border-b border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white'
              : 'bg-white/80 dark:bg-[#0B0F17]/85 backdrop-blur-xs py-4 sm:py-6 border-b border-slate-200/50 dark:border-slate-800/60 text-slate-900 dark:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <a
              href="#overview"
              className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 select-none hover:text-[#FF6B00] dark:hover:text-[#FF7A1A] transition-colors"
            >
              <span>Wholesale of Oklahoma</span>
            </a>
          </div>

          {/* Desktop Central Navigation Pill */}
          <div className="hidden lg:flex items-center gap-1 bg-white/90 dark:bg-[#162032]/90 backdrop-blur-md rounded-full pl-6 pr-2 py-1 shadow-sm border border-slate-200 dark:border-slate-700/60">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-xs px-3 py-2 font-semibold text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] dark:hover:text-[#FF7A1A] transition-colors"
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
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                {currentUser.role === 'admin' && (
                  <a
                    href="/admin"
                    className="text-xs font-bold text-[#FF6B00] hover:text-white bg-[#FF6B00]/10 hover:bg-[#FF6B00] px-3 py-1.5 rounded-full border border-[#FF6B00]/30 transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Admin Portal
                  </a>
                )}
                {currentUser.role === 'approved_customer' && (
                  <a
                    href="/account"
                    className="text-xs font-bold text-emerald-600 hover:text-white bg-emerald-50 hover:bg-emerald-600 px-3 py-1.5 rounded-full border border-emerald-200 transition-colors flex items-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    My Account
                  </a>
                )}
                {currentUser.role === 'pending_customer' && (
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                    <Clock className="w-3 h-3 text-amber-600" />
                    Pending Review
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white px-2.5 py-1.5 rounded-full transition-colors flex items-center gap-1 cursor-pointer"
                  title="Logout from wholesale portal"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setIsWholesaleModalOpen(true)}
                  className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF6B00] px-3 py-1.5 rounded-full transition-colors cursor-pointer"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-3.5 py-1.5 rounded-full transition-colors cursor-pointer border border-slate-300 dark:border-slate-600 flex items-center gap-1.5"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Login
                </button>
              </div>
            )}
          </div>

          {/* Right Action Links */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Header Theme Mode Switcher */}
            <ThemeToggle variant="header-button" />

            {/* Desktop & Mobile Cart Trigger in Header */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-[#FF6B00] transition-colors cursor-pointer bg-white dark:bg-[#162032] hover:bg-slate-50 dark:hover:bg-[#1E293B] px-3.5 py-2 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
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
              className="hidden sm:flex items-center gap-1.5 text-xs font-extrabold text-[#FF6B00] hover:text-[#E85F00] transition-colors cursor-pointer bg-white dark:bg-[#162032] hover:bg-slate-50 dark:hover:bg-[#1E293B] px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 shadow-sm"
            >
              <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
              (405) 768-2975
            </a>

            {/* Mobile Menu Toggler Button */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 transition-all duration-300 shadow-sm"
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
        <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs" />
      </div>

      {/* Mobile Navigation Drawer */}
      <div
        className={`lg:hidden fixed top-0 right-0 bottom-0 z-50 w-[85%] max-w-sm bg-white dark:bg-[#0F172A] border-l border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
          menuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-8 pb-8">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-2">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF6B00]">
              Navigation Links
            </span>
            <button
              onClick={() => setMenuOpen(false)}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-col gap-1">
            <div className="mb-2">
              <ThemeToggle variant="mobile-row" />
            </div>
            {navLinks.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`text-lg font-semibold text-slate-800 py-2.5 border-b border-slate-100 transition-all duration-500 hover:text-[#FF6B00] ${
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
              className="w-full text-left text-lg font-semibold text-slate-800 py-3 border-b border-slate-100 flex items-center justify-between transition-colors hover:text-[#FF6B00]"
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
              <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs text-slate-600">
                  Logged in as: <strong className="text-slate-900">{currentUser.email}</strong>
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
                  className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
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
            <div className="bg-slate-50 p-3 rounded-xl space-y-1 text-xs border border-slate-200">
              <p className="font-semibold text-slate-900">Central OKC Warehouse:</p>
              <p className="text-slate-600">4500 S Bryant Ave, OKC, OK 73135</p>
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
        {/* 1. Hero Header Section — Linear clarity + Oklahoma Trust */}
        <section id="overview" className="relative w-full min-h-screen overflow-hidden transition-colors duration-200" style={{ background: 'var(--bg-primary)' }}>
          {/* Boomerang Video Background */}
          <BoomerangVideoBg
            src={BG_VIDEO}
            className="absolute inset-0 w-full h-full"
            isMirrored={false}
            isColorInverted={false}
            isClear={true}
            overlayOpacity={isDark ? 30 : 8}
            overlayTheme={theme}
          />

          {/* Linear-style dot grid */}
          <div
            className="absolute inset-0 pointer-events-none z-[3]"
            style={{
              backgroundImage: `radial-gradient(circle, ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)'} 1px, transparent 1px)`,
              backgroundSize: '32px 32px',
              maskImage: 'radial-gradient(ellipse 80% 80% at 50% 20%, black 40%, transparent 100%)',
            }}
          />

          {/* Gradient fade */}
          <div className="absolute inset-0 pointer-events-none z-[4]" style={{ background: isDark ? 'linear-gradient(to bottom, rgba(9,9,11,0.5) 0%, rgba(9,9,11,0.2) 40%, rgba(9,9,11,0.8) 100%)' : 'linear-gradient(to bottom, rgba(250,250,250,0.4) 0%, rgba(250,250,250,0.1) 40%, rgba(250,250,250,0.75) 100%)' }} />

          {/* Ambient orange orbs */}
          <div className="absolute inset-0 pointer-events-none z-[4] overflow-hidden">
            <div className="orb-drift absolute top-[-15%] left-[-8%] w-[700px] h-[700px] rounded-full" style={{ background: 'var(--accent-primary)', opacity: isDark ? 0.14 : 0.06, filter: 'blur(160px)' }} />
            <div className="orb-drift-r absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full" style={{ background: 'var(--accent-primary)', opacity: isDark ? 0.12 : 0.05, filter: 'blur(130px)' }} />
          </div>

          {/* Hero content */}
          <div className={`relative z-10 flex flex-col items-center text-center ${showDisclaimer ? 'pt-36 sm:pt-44 md:pt-48' : 'pt-28 sm:pt-32 md:pt-36'} px-4 sm:px-6 pb-20`}>

            {/* Status badge — Linear command bar style */}
            <div
              className="hero-badge-enter animate-woo-badge inline-flex items-center gap-2.5 mb-7 px-4 py-1.5 rounded-full cursor-default select-none"
              style={{
                background: 'var(--surface-overlay)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-subtle)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-woo-ping" style={{ background: 'var(--accent-primary)' }} />
              <Star className="w-3.5 h-3.5" style={{ fill: '#F59E0B', color: '#F59E0B' }} />
              <span className="text-[11px] font-extrabold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>Licensed Oklahoma Wholesaler · 5.0 Star</span>
            </div>

            {/* Main headline — Linear-clean, single intent */}
            <h1
              className="hero-title-enter max-w-5xl"
              style={{
                fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
                fontSize: 'clamp(2.5rem, 6vw + 0.4rem, 5.25rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.05,
                color: 'var(--text-primary)',
              }}
            >
              Oklahoma&apos;s Premier{' '}
              <br className="hidden sm:block" />
              <span className="text-shimmer">Wholesale Distribution</span>{' '}Partner
            </h1>

            {/* Supporting copy — short and directive */}
            <p
              className="hero-sub-enter mt-6 max-w-2xl mx-auto px-2"
              style={{ fontSize: 'clamp(0.95rem, 1.5vw + 0.25rem, 1.125rem)', lineHeight: 1.65, color: 'var(--text-secondary)', fontWeight: 500 }}
            >
              900+ wholesale SKUs from 50+ top brands. Verified factory stock dispatched directly from our central OKC warehouse.
            </p>

            {/* CTA row */}
            <div className="hero-cta-enter mt-8 flex flex-wrap items-center justify-center gap-3">
              <a
                href="#brands"
                className="btn-primary btn-glow"
                style={{ fontSize: '0.875rem', padding: '0.75rem 1.75rem' }}
              >
                <Layers className="w-4 h-4" />
                Explore Brand Portfolio
              </a>

              <button
                type="button"
                onClick={() => setIsWholesaleModalOpen(true)}
                className="btn-secondary"
                style={{ fontSize: '0.875rem', padding: '0.75rem 1.75rem' }}
              >
                <UserCheck className="w-4 h-4" />
                Apply for Wholesale
              </button>

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setIsCartOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem' }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Cart {cartUnits > 0 && <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black text-white" style={{ background: 'var(--accent-primary)' }}>{cartUnits}</span>}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="btn-secondary"
                  style={{ fontSize: '0.875rem', padding: '0.75rem 1.5rem' }}
                >
                  <LogIn className="w-4 h-4" />
                  Retailer Login
                </button>
              )}
            </div>

            {/* Stats grid — compact Linear tokens */}
            <div className="hero-trust-enter mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl w-full mx-auto">
              {[
                { value: '900+', label: 'Active SKUs' },
                { value: '5.0★', label: 'Avg. Rating' },
                { value: '50+', label: 'Top Brands' },
                { value: '24hr', label: 'Fast Review' },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="card-lift flex flex-col items-center py-3.5 px-4 rounded-2xl cursor-default"
                  style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(12px)', border: '1px solid var(--border-subtle)' }}
                >
                  <span
                    className="text-xl sm:text-2xl font-black tracking-tight"
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: 'var(--text-primary)', letterSpacing: '-0.025em' }}
                  >
                    {stat.value}
                  </span>
                  <span className="label-overline mt-0.5">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Trust pills */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
              {['⚡ Same-Day OKC Pickup', '🔒 Licensed Master Distributor', '🚚 Statewide Metro Dispatch'].map((pill) => (
                <span
                  key={pill}
                  className="card-lift px-3.5 py-1.5 rounded-full"
                  style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(8px)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
                >
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Bottom-left corporate card */}
          <div
            className="hero-card-enter card-lift hidden xl:block absolute left-8 bottom-8 z-10 p-5 rounded-2xl max-w-xs"
            style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-subtle)', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-primary)' }} />
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Wholesale of Oklahoma</span>
            </div>
            <p className="text-xs leading-relaxed mb-4" style={{ color: 'var(--text-secondary)' }}>
              Direct warehouse inventory for licensed dispensaries, vape shops, and retail partners across Oklahoma.
            </p>
            <div className="flex gap-2.5">
              <a href="#pricing" className="btn-primary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>Directions</a>
              <button type="button" onClick={() => setIsWholesaleModalOpen(true)} className="btn-secondary" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', cursor: 'pointer' }}>Apply</button>
            </div>
          </div>

          {/* Bottom-right warehouse card */}
          <div
            className="hero-card-enter card-lift hidden xl:block absolute right-8 bottom-8 z-10 p-4 rounded-2xl"
            style={{ background: 'var(--surface-overlay)', backdropFilter: 'blur(16px)', border: '1px solid var(--border-subtle)', minWidth: '210px', boxShadow: '0 12px 32px rgba(0,0,0,0.08)' }}
          >
            <p className="label-overline mb-3" style={{ color: 'var(--accent-primary)' }}>Live Warehouse</p>
            <div className="space-y-2.5">
              {[
                { label: 'Disposable Vapes', pct: 92 },
                { label: 'Hardware & Mods', pct: 78 },
                { label: 'Accessories', pct: 85 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-[10px] font-semibold mb-1" style={{ color: 'var(--text-muted)' }}>
                    <span>{item.label}</span>
                    <span style={{ color: 'var(--accent-primary)' }}>{item.pct}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--border-subtle)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg, var(--accent-primary), #FDBA74)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[9px] mt-3 font-medium" style={{ color: 'var(--text-faint)' }}>Updated live · OKC Warehouse</p>
          </div>

          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 hidden sm:flex flex-col items-center gap-1" style={{ opacity: 0.5 }}>
            <span className="label-overline">Scroll</span>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ color: 'var(--accent-primary)', animation: 'woo-float 2s ease-in-out infinite' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </section>

        {/* Scrolling brand ticker strip */}
        <div className="w-full bg-[#FF6B00] py-3 overflow-hidden border-y border-[#E85F00] z-20 relative">
          <div className="ticker-track">
            {[
              '⚡ Same-Day OKC Pickup',
              '📦 900+ Active SKUs',
              '🏷️ Geekbar · Raz · Vozol · SMOK · Yocan · Vaporesso · Foger',
              '🔒 Licensed Oklahoma Wholesaler',
              '🚚 Statewide Metro Dispatch',
              '⭐ 5.0 Star Rated Partner',
              '📞 (405) 768-2975 · Call Live Dispatcher',
              '⚡ Same-Day OKC Pickup',
              '📦 900+ Active SKUs',
              '🏷️ Geekbar · Raz · Vozol · SMOK · Yocan · Vaporesso · Foger',
              '🔒 Licensed Oklahoma Wholesaler',
              '🚚 Statewide Metro Dispatch',
              '⭐ 5.0 Star Rated Partner',
              '📞 (405) 768-2975 · Call Live Dispatcher',
            ].map((item, i) => (
              <span key={i} className="inline-flex items-center text-white text-xs font-bold uppercase tracking-wider px-6 whitespace-nowrap">
                {item}
                <span className="ml-6 w-1 h-1 rounded-full bg-white/50 inline-block" />
              </span>
            ))}
          </div>
        </div>

        {/* Brand Marquee — infinite scrolling product image carousel */}
        <BrandMarquee />

        {/* 2. Official Wholesale Brands Showcase with Hardware & Packaging Images */}
        <div className="anim-hidden">
          <BrandDirectoryShowcase
            isLoggedIn={Boolean(currentUser)}
            onBrandClick={handleBrandClick}
            onOpenLogin={() => setIsLoginModalOpen(true)}
            onOpenApplication={() => setIsWholesaleModalOpen(true)}
          />
        </div>

        {/* 3. Product Spotlight — Apple/Nothing-style product closeup */}
        <div className="anim-hidden anim-delay-1">
          <ProductSpotlight onSelectBrand={handleBrandClick} />
        </div>

        {/* 4. Dynamic Category Showcase Section */}
        <div className="anim-hidden anim-delay-2"><CategoryShowcase /></div>


        {currentUser ? (
          <div id="inventory" className="relative">
            <div className="bg-gradient-to-r from-[#FF6B00]/10 via-orange-50/50 to-orange-50/20 border-y border-orange-200 py-4 px-4 shadow-xs">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 px-4">
                <div className="flex items-center gap-2.5">
                  <span className="bg-[#FF6B00] text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-xs">
                    Verified B2B Retailer
                  </span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentUser.businessName || currentUser.contactName || currentUser.email}
                  </span>
                  <span className="hidden md:inline text-xs text-slate-500">
                    · Live Wholesale Tier Pricing & Case Stock Active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    900+ Zoho SKUs Connected
                  </span>
                </div>
              </div>
            </div>
            <InventorySection initialBrand={activeBrandFilter} />
          </div>
        ) : (
          <div id="retailer-gateway" className="py-14 bg-slate-50 text-center border-t border-slate-200">
            <div className="max-w-4xl mx-auto px-4 space-y-4">
              <div className="inline-flex items-center gap-2 bg-white text-[#FF6B00] border border-slate-200 text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-xs">
                <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                <span>Oklahoma Closed Wholesale Network</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900">
                Login to Access Full 900+ Zoho Inventory Catalog & Wholesale Rates
              </h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                In compliance with Oklahoma wholesale distribution regulations, catalog browsing with tiered case pricing and direct ordering is unlocked inside the retailer gateway for verified partners.
              </p>
              <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsLoginModalOpen(true)}
                  className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-extrabold text-xs sm:text-sm px-8 py-4 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Retailer Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsWholesaleModalOpen(true)}
                  className="bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-[#FF6B00] font-bold text-xs sm:text-sm px-7 py-3.5 rounded-full transition-all flex items-center gap-2 cursor-pointer shadow-xs"
                >
                  <UserPlus className="w-4 h-4 text-[#FF6B00]" />
                  <span>Register Wholesale Account</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 5 & 6. Why Wholesale of Oklahoma & Ready to Buy Wholesale CTA */}
        <div className="anim-hidden"><WhyChooseUs onOpenApplication={() => setIsWholesaleModalOpen(true)} /></div>

        {/* 7. Separate Direct Restock Order Request Form */}
        <div className="anim-hidden anim-delay-1"><OrderForm /></div>

        {/* 8. Verified Customer Reviews Slider */}
        <div className="anim-hidden"><ReviewSlider /></div>

        {/* 9. Warehouse Photo Gallery */}
        <div className="anim-hidden anim-delay-2"><GallerySlider /></div>

        {/* 10. Complete Contact Directories with Map representation */}
        <div className="anim-hidden"><StoreDetails /></div>
      </main>

      {/* Regulatory Warning & Comprehensive Compliance Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 text-slate-600">
        {/* FDA / State Nicotine Regulatory Warning Banner */}
        <div className="bg-amber-50/80 border-b border-amber-200/80 py-4 px-4 text-center">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 text-xs">
            <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Regulatory Warning
            </span>
            <p className="text-slate-700 font-semibold text-[11px] sm:text-xs leading-relaxed">
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
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Wholesale of Oklahoma
                </h4>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Premier Wholesale of Oklahoma B2B master distributor supplying verified dispensaries, vape stores, and convenience stores with direct manufacturer inventory.
              </p>
              <div className="space-y-1.5 pt-1 text-slate-600">
                <p className="flex items-center gap-1.5 text-[11px]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                  <span className="font-semibold text-slate-900">Oklahoma Licensed Wholesaler</span>
                </p>
                <p className="text-[11px] text-slate-500">
                  4500 S Bryant Ave, OKC, OK 73135
                </p>
                <p className="text-[11px] text-[#FF6B00] font-bold">
                  (405) 768-2975
                </p>
                <p className="text-[10px] text-slate-500">
                  Mon–Sat: 9AM–8PM · Sun: 11AM–8PM
                </p>
              </div>
            </div>

            {/* Col 2: Brand Directory */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-[#FF6B00]">
                Brand Directory
              </h4>
              <ul className="space-y-1.5 text-slate-600">
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
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-[#FF6B00]">
                Categories
              </h4>
              <ul className="space-y-1.5 text-slate-600">
                {[
                  { label: 'Disposable Vapes', id: 'Disposable Vapes' },
                  { label: 'Vape Mods & Kits', id: 'Vape Mods & Kits' },
                  { label: 'Vape Juices & Salts', id: 'Vape Juice' },
                  { label: 'Pipes & Glassware', id: 'Pipes & Glass' },
                  { label: 'THCA & Hemp', id: 'THCA, CBD & Delta' },
                  { label: 'Premium Kratom', id: 'Kratom' },
                  { label: 'Rolling Papers & Cones', id: 'Accessories' },
                  { label: 'Wholesale Novelties', id: 'Novelties' },
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
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-[#FF6B00]">
                Retailer Tools
              </h4>
              <ul className="space-y-1.5 text-slate-600">
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
                    Why Wholesale of Oklahoma
                  </a>
                </li>
                <li>
                  <a href="#overview" className="hover:text-[#FF6B00] transition-colors">
                    OKC Warehouse Hub
                  </a>
                </li>
                <li>
                  <a href="tel:4057682975" className="hover:text-[#FF6B00] transition-colors font-semibold text-slate-900">
                    Dispatch: (405) 768-2975
                  </a>
                </li>
              </ul>
            </div>

            {/* Col 5: Sitemap & Compliance */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest text-[#FF6B00]">
                Sitemap & Legal
              </h4>
              <ul className="space-y-1.5 text-slate-600">
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
                  <span className="text-slate-500 hover:text-slate-900 cursor-default">
                    Oklahoma 21+ Age Verification
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 hover:text-slate-900 cursor-default">
                    Wholesale Terms of Service
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 hover:text-slate-900 cursor-default">
                    Privacy Policy & Data Rights
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 hover:text-slate-900 cursor-default">
                    Oklahoma Tax Permit (Form OK-500)
                  </span>
                </li>
                <li>
                  <span className="text-slate-500 hover:text-slate-900 cursor-default">
                    PACT Act Compliance
                  </span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
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
          className={`group relative flex items-center gap-2.5 bg-white hover:bg-slate-50 text-slate-900 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full shadow-xl border border-[#FF6B00]/40 transition-all duration-300 cursor-pointer select-none hover:scale-105 active:scale-95 ${
            cartUnits > 0 ? 'ring-2 ring-[#FF6B00]/60' : ''
          }`}
        >
          <div className="relative flex items-center justify-center">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00] border border-[#FF6B00]/30 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            {cartUnits > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-[#FF6B00] text-white text-[10px] font-black min-w-4 h-4 px-1 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartUnits}
              </span>
            )}
          </div>

          <div className="text-left leading-tight hidden sm:block">
            <div className="text-xs font-bold text-slate-900 flex items-center gap-1">
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
          <div className="bg-white/95 backdrop-blur-xl border border-[#FF6B00]/40 shadow-2xl rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-4 max-w-xl w-full pointer-events-auto animate-in slide-in-from-bottom-5 duration-300">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF6B00]/15 flex items-center justify-center text-[#FF6B00] shrink-0 shadow-xs border border-[#FF6B00]/30">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5 truncate">
                  <span>Wholesale Order Draft</span>
                  <span className="bg-[#FF6B00] text-white text-[9px] font-black px-2 py-0.5 rounded-full">
                    {cartUnits} units
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">
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
        onOpenLogin={() => {
          setIsWholesaleModalOpen(false);
          setIsLoginModalOpen(true);
        }}
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

      {/* Persistent Sticky Floating Dark/Light Theme Button with Color Combo Display */}
      <ThemeToggle variant="sticky-pill" />
    </div>
  );
}
