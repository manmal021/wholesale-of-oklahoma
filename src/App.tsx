import { useState, useEffect } from 'react';
import { LogIn, UserPlus, Play, Sparkles, Menu, X, Star, MapPin, Phone } from 'lucide-react';
import BoomerangVideoBg from './components/BoomerangVideoBg';
import ProductCatalog from './components/ProductCatalog';
import ReviewSlider from './components/ReviewSlider';
import StoreDetails from './components/StoreDetails';
import OrderForm from './components/OrderForm';

const BG_VIDEO = '/transi.mp4';

export default function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [quickContactMsg, setQuickContactMsg] = useState(false);

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

  const navLinks = [
    { href: '#overview', label: 'Overview' },
    { href: '#how', label: 'Best Sellers' },
    { href: '#reviews', label: 'Reviews' },
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
    <div className="w-full min-h-screen bg-[#f5f5f4] text-[#1f2a1d] overflow-y-auto selection:bg-[#336443]/20">

      {/* Hero Header Section */}
      <section id="overview" className="relative w-full min-h-screen sm:h-screen overflow-hidden">
        {/* Seamless Canvas Boomerang Loop Background with original colors and natural visual form */}
        <BoomerangVideoBg
          src={BG_VIDEO}
          className="absolute inset-0 w-full h-full"
          isMirrored={false}
          isColorInverted={false}
          isClear={true}
          overlayOpacity={45}
        />

        {/* Editorial Gradients & Soft Glowing Orbs */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#1f2a1d] via-[#2d3a2a] to-[#1f2a1d] opacity-10 pointer-events-none z-10" />
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#85AB8B] opacity-15 blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-[#336443] opacity-15 blur-[100px]" />
        </div>

        {/* Responsive Premium Navbar */}
        <nav className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 sm:px-6 md:px-10 py-4 sm:py-6">
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2 drop-shadow-sm select-none">
              Wholesale of OK<sup className="text-[10px] sm:text-xs font-semibold text-[#85AB8B]">TM</sup>
            </span>
          </div>

          {/* Desktop Central Pill Nav */}
          <div className="hidden lg:flex items-center gap-1 bg-black/45 backdrop-blur-md rounded-full pl-6 pr-1 py-1 shadow-md border border-white/10">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-sm px-3.5 py-2 font-semibold text-white/90 hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#direct-order-section"
              className="ml-2 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] text-xs font-bold px-5 py-2.5 rounded-full transition-colors uppercase tracking-wider shadow"
            >
              Order Now
            </a>
          </div>

          {/* Right Action Links */}
          <div className="flex items-center gap-3 sm:gap-6">
            <a
              href="tel:4057682975"
              className="hidden sm:flex items-center gap-2 text-xs font-extrabold text-[#85AB8B] hover:text-white transition-colors cursor-pointer bg-black/35 backdrop-blur-sm px-4 py-2 rounded-full border border-white/10"
            >
              <LogIn className="w-4 h-4 text-white" />
              (405) 768-2975
            </a>

            {/* Mobile Toggler Button using requested CSS transitions */}
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="lg:hidden relative flex items-center justify-center w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white transition-all duration-300 hover:bg-black/60"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
            >
              <Menu
                className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                  }`}
              />
              <X
                className={`w-5 h-5 absolute transition-all duration-300 ${menuOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                  }`}
              />
            </button>
          </div>
        </nav>

        {/* Mobile Backdrop Overlay Menu */}
        <div
          className={`lg:hidden fixed inset-0 z-20 transition-opacity duration-300 ${menuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            }`}
          onClick={() => setMenuOpen(false)}
        >
          <div className="absolute inset-0 bg-[#1f2a1d]/40 backdrop-blur-sm" />
        </div>

        {/* Mobile Navigation Drawer with perfect CSS transitions */}
        <div
          className={`lg:hidden fixed top-0 right-0 bottom-0 z-20 w-[85%] max-w-sm bg-white/95 backdrop-blur-xl shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${menuOpen ? 'translate-x-0' : 'translate-x-full'
            }`}
        >
          <div className="flex flex-col h-full pt-24 px-8 pb-8">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#85AB8B] mb-2">Navigation Links</span>
            <div className="flex flex-col gap-1">
              {navLinks.map((link, i) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className={`text-2xl font-semibold text-[#1f2a1d] py-4 border-b border-[#1f2a1d]/10 transition-all duration-500 ${menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                    }`}
                  style={{ transitionDelay: menuOpen ? `${150 + i * 70}ms` : '0ms' }}
                >
                  {link.label}
                </a>
              ))}
            </div>

            {/* Mobile specific drawer buttons */}
            <div
              className={`mt-auto flex flex-col gap-4 transition-all duration-500 ${menuOpen ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'
                }`}
              style={{ transitionDelay: menuOpen ? '400ms' : '0ms' }}
            >
              <div className="bg-neutral-50 p-4 rounded-xl space-y-2 text-xs">
                <p className="font-semibold text-[#1f2a1d]">Warehouse Contact:</p>
                <p className="text-neutral-500">4500 S Bryant Ave, OKC</p>
                <p className="text-neutral-600 font-semibold">(405) 768-2975</p>
              </div>

              <button
                onClick={() => {
                  setMenuOpen(false);
                  window.location.href = 'tel:4057682975';
                }}
                className="bg-[#1f2a1d] hover:bg-[#2a3827] text-white text-sm font-semibold px-5 py-3 rounded-full transition-colors flex items-center justify-center gap-2"
              >
                Call Live Dispatcher
              </button>
            </div>
          </div>
        </div>

        {/* Central Display Hero Copy */}
        <div className="relative z-10 flex flex-col items-center text-center pt-24 sm:pt-28 md:pt-32 px-4 sm:px-6">
          <div className="inline-flex items-center gap-1.5 bg-black/55 backdrop-blur-md text-white text-xs font-semibold px-4 py-1.5 rounded-full mb-8 border border-white/10 shadow-sm">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="font-extrabold text-[11px] uppercase tracking-wider">Licensed Oklahoma Wholesaler · 5.0 Star</span>
          </div>

          <h1
            className="font-extrabold leading-[0.88] text-white text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[5.5rem] xl:text-[6.5rem] tracking-[-0.04em] max-w-5xl drop-shadow"
            style={{
              fontFamily: '"Neue Haas Grotesk Display Pro 55 Roman", "Neue Haas Grotesk Text Pro", "Helvetica Neue", Helvetica, Arial, sans-serif',
            }}
          >
            Wholesale of{' '}
            <span className="text-[#85AB8B]">
              Oklahoma
            </span>
          </h1>
          <p className="mt-8 text-white/90 text-sm sm:text-base md:text-lg font-medium leading-relaxed max-w-xl mx-auto px-2 drop-shadow-sm">
            Excellent wholesale company with a strong product selection for dispensaries, vape stores, hookahs, and gas stations. Fast communication, smooth ordering, and dependable delivery.
          </p>
        </div>

        {/* Bottom-left customized corporate profile badge */}
        <div className="absolute left-4 right-4 sm:right-auto sm:left-6 md:left-10 bottom-6 sm:bottom-8 md:bottom-10 z-10 max-w-sm bg-black/55 backdrop-blur-md border border-white/10 p-5 rounded-[24px] shadow-lg">
          <div className="flex items-center gap-2 text-[#85AB8B] mb-3">
            <Sparkles className="w-4 h-4 text-[#85AB8B]" />
            <span className="text-sm font-bold tracking-wide">
              Wholesale of OK<sup className="text-[10px]">TM</sup>
            </span>
          </div>
          <p className="text-white/85 text-xs leading-relaxed mb-6 max-w-xs font-semibold">
            Wholesale of Oklahoma smoothly supplies your dispensaries and smoke shops, streamlining bulk data pathways and inventory setup without the hassle.
          </p>
          <div className="flex gap-4">
            <a
              href="#pricing"
              className="bg-[#85AB8B] text-[#1f2a1d] text-xs font-bold px-6 py-3.5 rounded-full shadow hover:bg-[#97bba4] transition-colors"
            >
              Directions
            </a>
            <a
              href="#direct-order-section"
              className="border border-white/20 text-white text-xs font-bold px-6 py-3.5 rounded-full hover:bg-white/10 transition-colors"
            >
              Order Now
            </a>
          </div>
        </div>

        {/* Dynamic dispatch info popup notification */}
        {quickContactMsg && (
          <div className="absolute right-4 bottom-20 z-50 bg-[#1f2a1d] text-white p-4 rounded-xl shadow-lg max-w-xs text-xs space-y-2 border border-white/10 animate-in slide-in-from-right-6 duration-300">
            <p className="font-semibold text-[#85AB8B]">✓ Live loading help dispatch</p>
            <p className="text-neutral-300">We help stack your restocks directly into your delivery cargo vehicles on Bryant Ave!</p>
          </div>
        )}
      </section>

      {/* 2. Interactive Products Grid & profit calculator panel */}
      <ProductCatalog />

      {/* 2.5 Separate Premium Order Now Form with customized fields */}
      <OrderForm />

      {/* 3. Verified Maps Customer Testimonials Test Slider */}
      <ReviewSlider />

      {/* 4. Complete contact directories with Map representation */}
      <StoreDetails />

      {/* Tiny footer */}
      <footer className="bg-[#1f2a1d] border-t border-white/10 py-8 text-neutral-400 text-center px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 Wholesale of Oklahoma™ | 4500 S Bryant Ave, Oklahoma City, OK 73135. All Rights Reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Hours: Closes 8 PM nightly · Opens 11 AM Sun</span>
            <span>Tel: (405) 768-2975</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
