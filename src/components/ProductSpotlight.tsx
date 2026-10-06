import React, { useEffect, useRef, useState } from 'react';
import { Zap, Shield, Package, ChevronRight, Droplets, Battery, Maximize } from 'lucide-react';

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
    name: 'American Standard Kit',
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
];

// Helper hook for intersection observer to trigger animations
function useOnScreen(ref: React.RefObject<Element>, rootMargin = '0px') {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
          // Optional: observer.disconnect() if we only want it to animate once
        }
      },
      { rootMargin, threshold: 0.2 }
    );
    if (ref.current) {
      observer.observe(ref.current);
    }
    return () => {
      observer.disconnect();
    };
  }, [ref, rootMargin]);
  return isIntersecting;
}

interface ProductSpotlightProps {
  onSelectBrand?: (brandName: string) => void;
}

export default function ProductSpotlight({ onSelectBrand }: ProductSpotlightProps) {
  // Use map of refs
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <div className="bg-[#f8f9fa] dark:bg-[#0a0a0b] overflow-hidden flex flex-col relative w-full">
      {/* Introduction Header for the Showcase Section */}
      <div className="py-24 text-center relative z-10 max-w-4xl mx-auto px-6">
         <h2 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-6">
           Premium Wholesale <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-400 to-slate-600">Collection</span>
         </h2>
         <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
           Explore our top-moving products, curated for fast retail turnover and massive margins.
         </p>
      </div>

      {SPOTLIGHT_PRODUCTS.map((product, i) => {
        const isEven = i % 2 === 0;
        return (
          <ProductSection 
            key={product.slug} 
            product={product} 
            isEven={isEven} 
            onSelectBrand={onSelectBrand} 
          />
        );
      })}
    </div>
  );
}

function ProductSection({ product, isEven, onSelectBrand }: { product: SpotlightProduct, isEven: boolean, onSelectBrand?: (brandName: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, '-10%');

  // Animation classes
  const productAnim = isVisible 
    ? 'opacity-100 translate-y-0 scale-100 rotate-0' 
    : 'opacity-0 translate-y-12 scale-[0.96] rotate-[-2deg]';
  
  const textAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-8';

  const bgTextAnim = isVisible
    ? 'translate-y-[-10%]'
    : 'translate-y-[10%]';

  // Feature icons mapping helper
  const getFeatureIcon = (index: number, color: string) => {
    const icons = [Zap, Maximize, Droplets, Battery];
    const Icon = icons[index % icons.length];
    return <Icon className="w-5 h-5" style={{ color }} />;
  };

  return (
    <section 
      ref={ref}
      className={`relative min-h-[90vh] flex items-center justify-center overflow-hidden py-20 lg:py-32 w-full transition-all duration-1000 ease-out`}
    >
      {/* Giant Faded Background Text */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none z-0" aria-hidden="true">
        <span 
          className={`text-[20vw] md:text-[18vw] font-black uppercase text-slate-900/[0.04] dark:text-white/[0.03] whitespace-nowrap leading-none tracking-tighter transition-transform duration-[1.5s] ease-out ${bgTextAnim}`} 
        >
          {product.brand}
        </span>
      </div>

      {/* Subtle Radial Gradient Glow behind the product */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-40 dark:opacity-20 mix-blend-multiply dark:mix-blend-screen transition-opacity duration-1000 z-0" 
        style={{ 
          background: `radial-gradient(circle at ${isEven ? '25%' : '75%'} 50%, ${product.accentColor}33, transparent 55%)` 
        }} 
      />

      <div className={`relative z-10 w-full max-w-[1600px] mx-auto px-4 sm:px-8 lg:px-16 flex flex-col ${isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-0`}>
        
        {/* Product Image Column */}
        <div className={`w-full lg:w-[55%] flex justify-center relative ${isEven ? 'lg:justify-end lg:-mr-16' : 'lg:justify-start lg:-ml-16'} z-20`}>
          <div className={`transition-all duration-1000 delay-100 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${productAnim}`}>
            <img 
              src={product.imageSrc} 
              alt={product.imageAlt} 
              className="w-full max-w-[320px] sm:max-w-md lg:max-w-[700px] object-contain mix-blend-normal"
              style={{
                filter: `drop-shadow(0 25px 45px ${product.accentColor}30)`
              }}
            />
          </div>
        </div>

        {/* Text Information Column */}
        <div className={`w-full lg:w-[45%] flex flex-col ${isEven ? 'lg:pl-20' : 'lg:pr-20'} z-10 transition-all duration-1000 delay-300 ease-out ${textAnim}`}>
          
          {/* Eyebrow / Brand / Puffs */}
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm font-extrabold tracking-widest uppercase text-slate-500 dark:text-slate-400">{product.brand}</span>
            <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700"></span>
            <span className="text-sm font-extrabold tracking-widest uppercase text-slate-500 dark:text-slate-400">{product.puffs}</span>
          </div>
          
          {/* Main Product Heading */}
          <h3 className="text-6xl lg:text-[5.5rem] font-black leading-[0.85] tracking-tighter text-slate-900 dark:text-white mb-6">
             {product.name}
          </h3>

          {/* Tagline */}
          <p className="text-2xl sm:text-3xl font-semibold tracking-tight italic mb-6" style={{ color: product.accentColor }}>
            {product.tagline}
          </p>

          {/* Description */}
          <p className="text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10 max-w-xl">
            {product.description}
          </p>

          {/* Micro-Stat Blocks instead of bullets */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 mb-12 max-w-xl">
            {product.features.map((feat, idx) => {
              // Split feature into two lines if there's a space for a more square block look
              const words = feat.split(' ');
              const firstWord = words[0];
              const rest = words.slice(1).join(' ');

              return (
                <div key={feat} className="flex flex-col gap-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ backgroundColor: `${product.accentColor}1A` }}>
                    {getFeatureIcon(idx, product.accentColor)}
                  </div>
                  <div>
                    <div className="font-black text-slate-900 dark:text-white text-lg leading-tight uppercase tracking-wide">{firstWord}</div>
                    <div className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-tight uppercase tracking-wider">{rest}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Call to Action */}
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => {
                if (onSelectBrand) onSelectBrand(product.brand);
                const el = document.getElementById('inventory');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="group relative overflow-hidden inline-flex items-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black uppercase tracking-widest px-8 py-5 rounded-full hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <span className="relative z-10 flex items-center gap-2">
                Order Wholesale <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <div 
                className="absolute inset-0 z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: product.accentColor }}
              />
            </button>

            {/* Trust badge */}
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <Shield className="w-4 h-4" />
              Verified Factory Stock
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

