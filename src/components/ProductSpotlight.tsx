import React, { useState, useEffect, useRef } from 'react';
import { Zap, Shield, Package, Star, ChevronRight } from 'lucide-react';

interface SpotlightProduct {
  name: string;
  brand: string;
  tagline: string;
  description: string;
  puffs: string;
  features: string[];
  imageSrc: string;
  imageAlt: string;
  badge: string;
  accentColor: string;
  slug: string;
}

const SPOTLIGHT_PRODUCTS: SpotlightProduct[] = [
  {
    name: 'Foger Kit & Pod',
    brand: 'Foger',
    tagline: 'High margins. Fast turnover.',
    description: 'A swappable pod system with clear tank visibility that keeps customers coming back. This is a must-stock kit for any serious retail shop.',
    puffs: '30,000 Puffs',
    features: ['Magnetic Pod Dock', 'Clear Tank Window', 'High Repeat Sales', 'Fast Retail Turnover'],
    imageSrc: '/products/foger-30k.jpg',
    imageAlt: 'Foger Kit and Pod',
    badge: '⚡ High Turnover',
    accentColor: '#0EA5E9',
    slug: 'foger',
  },
  {
    name: 'Pulse 15000',
    brand: 'Geek Bar',
    tagline: 'The undisputed crowd favorite.',
    description: 'A proven top-seller across all of our Oklahoma routes. Features a full screen display and dual mesh coils that your customers already know and ask for by name.',
    puffs: '15,000 Puffs',
    features: ['Dual Mesh Coils', 'Full Screen Display', 'Pulse Mode Boost', 'Guaranteed Seller'],
    imageSrc: '/products/geekbar-15k.png',
    imageAlt: 'Geekbar 15k',
    badge: '#1 Best Seller',
    accentColor: '#F43F5E',
    slug: 'geekbar-15k',
  },
  {
    name: 'Pulse X 25000',
    brand: 'Geek Bar',
    tagline: 'Next-level capacity and performance.',
    description: 'The upgraded 25K model is flying off shelves. With its massive HD display and dual-core coils, this is currently one of our fastest-moving SKUs.',
    puffs: '25,000 Puffs',
    features: ['Dual-Core Coils', 'Pulse Mode Boost', 'Full HD Display', 'High Retail Demand'],
    imageSrc: '/products/geekbar-25k.png',
    imageAlt: 'Geek Bar Pulse X 25000',
    badge: '🔥 Fast Restock',
    accentColor: '#7C3AED',
    slug: 'geekbar-25k',
  },
  {
    name: 'Pulse 2',
    brand: 'Geek Bar',
    tagline: 'The newest addition to the Pulse family.',
    description: 'An upgraded 3D curved display and refined dual mesh coils make this the next big hit. Stock up early before local competitors catch on.',
    puffs: '25,000 Puffs',
    features: ['3D Curved Dome Screen', 'Upgraded VPU Tech', 'Strong Retail Demand', 'Extended Battery Life'],
    imageSrc: '/products/geekbar_pulse_2.jpg',
    imageAlt: 'Geekbar Pulse 2',
    badge: '⭐ New Release',
    accentColor: '#10B981',
    slug: 'geekbar-pulse-2',
  },
  {
    name: 'Pulse X2',
    brand: 'Geek Bar',
    tagline: 'Massive 50K capacity for heavy hitters.',
    description: 'The absolute unit of the Geek Bar lineup. Offering up to 50,000 puffs and a massive screen, it commands a premium retail price point and excellent margins.',
    puffs: '50,000 Puffs',
    features: ['50K Puff Capacity', 'Large Wrap-Around Screen', 'Premium Retail Margins', 'High-End Build Quality'],
    imageSrc: '/products/geekbar_pulse_x2.jpg',
    imageAlt: 'Geekbar Pulse X2',
    badge: '🚀 Top Tier',
    accentColor: '#3B82F6',
    slug: 'geekbar-pulse-x2',
  },
  {
    name: 'American Standard Kit & Pod',
    brand: 'American Standard',
    tagline: 'A reliable, high-margin pod system.',
    description: 'An incredibly popular closed-pod system that guarantees repeat pod sales. Clean design, leak-resistant, and highly dependable for your regulars.',
    puffs: 'Rechargeable Kit',
    features: ['Durable Alloy Build', 'High Repeat Sales', 'Leak-Resistant Pods', 'Type-C Fast Charge'],
    imageSrc: '/products/american_standard_kit.jpg',
    imageAlt: 'American Standard Kit and Pod',
    badge: '🇺🇸 Premium Kit',
    accentColor: '#64748B',
    slug: 'american-standard',
  },
  {
    name: 'Rave 50000',
    brand: 'VOZOL',
    tagline: 'Unmatched 50K capacity and control.',
    description: 'A heavy-duty device featuring a modular pod design and 6-level wattage control. We have direct factory allocation for Oklahoma shops.',
    puffs: '50,000 Puffs',
    features: ['Modular Pod System', 'Adjustable Wattage', 'High Retail Value', 'Authenticity QR'],
    imageSrc: '/products/vozol-50k.png',
    imageAlt: 'VOZOL Rave 50000',
    badge: '★ Master Partner',
    accentColor: '#F97316',
    slug: 'vozol',
  },
];

interface ProductSpotlightProps {
  onSelectBrand?: (brandName: string) => void;
}

export default function ProductSpotlight({ onSelectBrand }: ProductSpotlightProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const productRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const index = Number(entry.target.getAttribute('data-index'));
          setActiveIdx(index);
        }
      });
    }, { threshold: 0.6 });

    productRefs.current.forEach(ref => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  const activeProduct = SPOTLIGHT_PRODUCTS[activeIdx];

  return (
    <section className="bg-white border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          
          {/* Left: Sticky Image Container */}
          <div className="hidden lg:block relative">
            <div className="sticky top-0 h-screen flex items-center justify-center">
              <div className="relative w-full max-w-lg mx-auto transition-all duration-700">
                {/* Dynamic Glow */}
                <div
                  className="absolute inset-0 rounded-full blur-3xl pointer-events-none transition-colors duration-700 ease-in-out"
                  style={{ background: `radial-gradient(circle, ${activeProduct.accentColor}25 0%, transparent 70%)`, transform: 'scale(1.2)' }}
                />
                
                {/* Images superimposed with opacity transitions */}
                {SPOTLIGHT_PRODUCTS.map((p, i) => (
                  <img
                    key={p.slug}
                    src={p.imageSrc}
                    alt={p.imageAlt}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-h-[500px] object-contain transition-all duration-700 ease-in-out"
                    style={{
                      opacity: i === activeIdx ? 1 : 0,
                      transform: i === activeIdx ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.95)',
                      filter: `drop-shadow(0 40px 80px ${p.accentColor}30)`,
                      zIndex: i === activeIdx ? 10 : 0
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Right: Scrolling Content */}
          <div ref={containerRef} className="py-20 lg:py-[30vh]">
            {/* Header for mobile and context */}
            <div className="mb-20">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-4 border border-slate-200">
                <Star className="w-3 h-3 text-slate-400" />
                Featured Innovations
              </span>
              <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Wholesale <span className="text-slate-400">Bestsellers</span>
              </h2>
            </div>

            {SPOTLIGHT_PRODUCTS.map((product, i) => (
              <div
                key={product.slug}
                data-index={i}
                ref={el => productRefs.current[i] = el}
                className={`min-h-[70vh] flex flex-col justify-center transition-opacity duration-700 ${i === activeIdx ? 'opacity-100' : 'opacity-30 lg:opacity-100'}`}
              >
                {/* Mobile Image (Hidden on Desktop) */}
                <div className="lg:hidden relative w-full max-w-sm mx-auto mb-10">
                  <div className="absolute inset-0 rounded-full blur-3xl pointer-events-none" style={{ background: `radial-gradient(circle, ${product.accentColor}25 0%, transparent 70%)` }} />
                  <img src={product.imageSrc} alt={product.imageAlt} className="relative z-10 w-full max-h-[350px] object-contain" />
                </div>

                <div className="space-y-6">
                  {/* Brand label */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{product.brand}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{product.puffs}</span>
                  </div>

                  {/* Product name */}
                  <h3 className="text-4xl sm:text-6xl font-black tracking-tighter text-slate-900" style={{ lineHeight: 0.95 }}>
                    {product.name}
                  </h3>

                  {/* Tagline */}
                  <p className="text-xl sm:text-2xl font-semibold italic" style={{ color: product.accentColor }}>
                    {product.tagline}
                  </p>

                  {/* Description */}
                  <p className="text-base sm:text-lg text-slate-600 max-w-md leading-relaxed">
                    {product.description}
                  </p>

                  {/* Feature list */}
                  <ul className="space-y-3 pt-4">
                    {product.features.map((feat) => (
                      <li key={feat} className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: `${product.accentColor}15` }}>
                          <Zap className="w-3.5 h-3.5" style={{ color: product.accentColor }} />
                        </span>
                        <span className="text-sm font-bold text-slate-700">
                          {feat}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTAs */}
                  <div className="flex flex-wrap items-center gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelectBrand) onSelectBrand(product.brand);
                        const el = document.getElementById('inventory');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="text-white text-sm font-extrabold px-6 py-3.5 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center gap-2"
                      style={{ background: product.accentColor, boxShadow: `0 8px 24px ${product.accentColor}40` }}
                    >
                      <Package className="w-4 h-4" />
                      Order Wholesale
                    </button>
                  </div>

                  {/* Trust note */}
                  <p className="flex items-center gap-1.5 text-xs text-slate-400 font-medium pt-2">
                    <Shield className="w-3.5 h-3.5" />
                    Verified factory stock · OKC warehouse ready
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
