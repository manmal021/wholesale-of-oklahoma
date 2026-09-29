import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, Zap, Shield, Package, Star, ChevronRight } from 'lucide-react';
import { animate, createTimeline, onScroll } from 'animejs';

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
    name: 'Rave 50000',
    brand: 'VOZOL',
    tagline: 'The pinnacle of disposable engineering.',
    description: 'Full modular pod architecture with 6-level wattage tuning, party ambient screen, and factory-direct OKC allocation.',
    puffs: '50,000 Puffs',
    features: ['Modular Pod System', '6-Level Wattage', 'Ambient LED Display', 'Anti-Counterfeit QR'],
    imageSrc: '/products/vozol-50k.png',
    imageAlt: 'VOZOL Rave 50000',
    badge: '★ Master Partner',
    accentColor: '#F97316',
    slug: 'vozol',
  },
  {
    name: 'Pulse X 25000',
    brand: 'Geek Bar',
    tagline: 'Dual-mesh clarity. Full-screen intelligence.',
    description: 'Best-in-class dual-core mesh coils with pulse mode boost and an HD full-screen display. Oklahoma\'s #1 fastest-moving SKU.',
    puffs: '25,000 Puffs',
    features: ['Dual-Core Mesh Coils', 'Pulse Mode Boost', 'Full HD Display', 'Smart Airflow Sensor'],
    imageSrc: '/products/geekbar-25k.png',
    imageAlt: 'Geek Bar Pulse X 25000',
    badge: '#1 Best Seller',
    accentColor: '#7C3AED',
    slug: 'geekbar',
  },
  {
    name: 'Switch Pro 30K',
    brand: 'Foger',
    tagline: 'Swappable pods. Zero compromise.',
    description: 'Magnetic dock technology with clear tank visibility and eco-friendly swappable pods. Built for velocity retail turnover.',
    puffs: '30,000 Puffs',
    features: ['Magnetic Pod Dock', 'Clear Tank Window', 'Eco Pod Swap', 'High Turnover SKU'],
    imageSrc: '/products/foger-30k.jpg',
    imageAlt: 'Foger Switch Pro 30K',
    badge: '⚡ High Turnover',
    accentColor: '#0EA5E9',
    slug: 'foger',
  },
];

interface ProductSpotlightProps {
  onSelectBrand?: (brandName: string) => void;
}

export default function ProductSpotlight({ onSelectBrand }: ProductSpotlightProps) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [imgLoaded, setImgLoaded] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // Scroll entrance — animate the whole section in
  useEffect(() => {
    if (!sectionRef.current) return;
    const cleanup = onScroll({
      target: sectionRef.current,
      enter: 'top 88%',
      onEnter: () => {
        setVisible(true);
        animate(sectionRef.current!, {
          opacity: [0, 1],
          translateY: [40, 0],
          duration: 900,
          ease: 'outExpo',
        });
      },
    });
    return () => { if (typeof (cleanup as any)?.revert === 'function') (cleanup as any).revert(); };
  }, []);

  const handleSelect = (idx: number) => {
    if (idx === activeIdx) return;
    const content = contentRef.current;
    if (!content) { setActiveIdx(idx); return; }

    // Fade out current
    animate(content, {
      opacity: [1, 0],
      translateY: [0, -12],
      duration: 180,
      ease: 'inQuad',
      onComplete: () => {
        setActiveIdx(idx);
        setImgLoaded(false);
        // Fade in new
        animate(content, {
          opacity: [0, 1],
          translateY: [16, 0],
          duration: 450,
          ease: 'outExpo',
        });
      },
    });
  };


  const product = SPOTLIGHT_PRODUCTS[activeIdx];

  const handleCTA = () => {
    if (onSelectBrand) onSelectBrand(product.brand);
    const el = document.getElementById('inventory');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      className="spotlight-section py-28 relative"
      style={{ borderTop: '1px solid var(--border-subtle)', borderBottom: '1px solid var(--border-subtle)' }}
    >
      <div className="spotlight-gradient" />

      {/* Scan line effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <div
          className="absolute w-full h-px"
          style={{
            background: `linear-gradient(90deg, transparent, ${product.accentColor}40, transparent)`,
            animation: 'woo-scan 6s ease-in-out infinite',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section label */}
        <div className={`text-center mb-14 ${visible ? 'anim-hidden anim-visible' : 'anim-hidden'}`}>
          <span className="section-label mb-4 inline-flex">
            <Star className="w-3 h-3 fill-current" />
            Product Spotlight
          </span>
          <h2 className="heading-1 mt-4" style={{ color: 'var(--text-primary)' }}>
            Wholesale <span className="text-shimmer">Bestsellers</span>
          </h2>
          <p className="body-lead mt-3 max-w-lg mx-auto">
            Our highest-velocity SKUs — direct from OKC warehouse with verified factory stock.
          </p>
        </div>

        {/* Selector tabs */}
        <div className="flex items-center justify-center gap-2 mb-16 flex-wrap">
          {SPOTLIGHT_PRODUCTS.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => handleSelect(i)}
              className="relative px-5 py-2.5 rounded-full text-sm font-700 transition-all duration-200 cursor-pointer"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontWeight: 700,
                background: i === activeIdx ? p.accentColor : 'var(--surface-card)',
                color: i === activeIdx ? '#fff' : 'var(--text-muted)',
                border: `1px solid ${i === activeIdx ? p.accentColor : 'var(--border-subtle)'}`,
                boxShadow: i === activeIdx ? `0 4px 20px ${p.accentColor}40` : 'none',
                transform: i === activeIdx ? 'scale(1.04)' : 'scale(1)',
              }}
            >
              {p.brand}
            </button>
          ))}
        </div>

        {/* Main spotlight card — Apple layout */}
        <div
          ref={contentRef}
          className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center"
        >
          {/* Left: Product image — centered, dramatic */}
          <div className="flex items-center justify-center order-2 lg:order-1">
            <div className="relative w-full max-w-sm mx-auto">
              {/* Glow blob behind image */}
              <div
                className="absolute inset-0 rounded-full blur-3xl pointer-events-none"
                style={{ background: `radial-gradient(circle, ${product.accentColor}25 0%, transparent 70%)`, transform: 'scale(1.3)' }}
              />
              <img
                src={product.imageSrc}
                alt={product.imageAlt}
                onLoad={() => setImgLoaded(true)}
                className="product-hero-img relative z-10 w-full"
                style={{
                  maxHeight: '460px',
                  objectFit: 'contain',
                  opacity: imgLoaded ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                  filter: `drop-shadow(0 40px 80px ${product.accentColor}30)`,
                }}
                onError={(e) => {
                  // Fallback to icon if image fails
                  (e.target as HTMLImageElement).style.display = 'none';
                  setImgLoaded(true);
                }}
              />
              {/* Fallback render when no image */}
              {!imgLoaded && (
                <div className="relative z-10 w-full flex items-center justify-center"
                  style={{ height: '300px' }}>
                  <div className="w-40 h-40 rounded-3xl flex items-center justify-center text-8xl"
                    style={{ background: `${product.accentColor}15`, border: `2px solid ${product.accentColor}30` }}>
                    💨
                  </div>
                </div>
              )}

              {/* Floating badge */}
              <div
                className="absolute -top-4 -right-4 z-20 px-3 py-1.5 rounded-full text-xs font-black"
                style={{ background: product.accentColor, color: '#fff', boxShadow: `0 4px 16px ${product.accentColor}50` }}
              >
                {product.badge}
              </div>
            </div>
          </div>

          {/* Right: Product info — Nothing/Linear editorial */}
          <div className="order-1 lg:order-2 space-y-6">
            {/* Brand label */}
            <div className="flex items-center gap-2">
              <span className="label-overline">{product.brand}</span>
              <span style={{ color: 'var(--border-subtle)' }}>·</span>
              <span className="label-overline">{product.puffs}</span>
            </div>

            {/* Product name — massive */}
            <h3
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                fontWeight: 800,
                letterSpacing: '-0.04em',
                lineHeight: 1.0,
                color: 'var(--text-primary)',
              }}
            >
              {product.name}
            </h3>

            {/* Tagline — Apple-style italic */}
            <p style={{ fontSize: '1.125rem', fontStyle: 'italic', color: product.accentColor, fontWeight: 600 }}>
              {product.tagline}
            </p>

            {/* Description */}
            <p className="body-lead" style={{ maxWidth: '480px' }}>
              {product.description}
            </p>

            {/* Feature list */}
            <ul className="space-y-2.5">
              {product.features.map((feat) => (
                <li key={feat} className="flex items-center gap-3">
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: `${product.accentColor}15` }}
                  >
                    <Zap className="w-3 h-3" style={{ color: product.accentColor }} />
                  </span>
                  <span className="text-sm font-600" style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                    {feat}
                  </span>
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCTA}
                className="btn-primary btn-glow"
                style={{ background: product.accentColor, boxShadow: `0 8px 24px ${product.accentColor}40` }}
              >
                <Package className="w-4 h-4" />
                Order Wholesale
              </button>
              <button
                type="button"
                onClick={handleCTA}
                className="btn-secondary"
              >
                View Catalog
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Trust note */}
            <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-faint)' }}>
              <Shield className="w-3.5 h-3.5" />
              Verified factory stock · OKC warehouse ready · Anti-counterfeit QR on every unit
            </p>
          </div>
        </div>

        {/* Bottom product navigator dots */}
        <div className="flex items-center justify-center gap-2.5 mt-14">
          {SPOTLIGHT_PRODUCTS.map((p, i) => (
            <button
              key={p.slug}
              type="button"
              onClick={() => handleSelect(i)}
              className="transition-all duration-300 rounded-full cursor-pointer"
              style={{
                width: i === activeIdx ? '24px' : '8px',
                height: '8px',
                background: i === activeIdx ? product.accentColor : 'var(--border-subtle)',
              }}
              aria-label={`View ${p.brand} ${p.name}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
