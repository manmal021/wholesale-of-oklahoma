import React, { useEffect, useRef } from 'react';
import { ArrowRight, ShieldCheck, Award, Zap, TrendingUp } from 'lucide-react';
import { animate, stagger, onScroll } from 'animejs';

interface Brand {
  name: string;
  slug: string;
  category: string;
  badge: string;
  puffs: string;
  skus: number;
  highlight?: boolean;
}

const BRANDS: Brand[] = [
  { name: 'Geek Bar', slug: 'geekbar', category: 'Smart Disposables', badge: '#1 Best Seller', puffs: '15K–60K puffs', skus: 132, highlight: true },
  { name: 'VOZOL', slug: 'vozol', category: 'High-Capacity Disposables', badge: 'Master Partner', puffs: 'Up to 50K puffs', skus: 80, highlight: true },
  { name: 'Foger', slug: 'foger', category: 'Swappable Pod Systems', badge: 'High Turnover', puffs: '10K–30K puffs', skus: 75 },
  { name: 'RAZ', slug: 'raz', category: 'HD Display Disposables', badge: 'Premium', puffs: '9K–25K puffs', skus: 60 },
  { name: 'Lost Mary', slug: 'lost-mary', category: 'Ergonomic Disposables', badge: 'Fan Favorite', puffs: '5K–20K puffs', skus: 55 },
  { name: 'Vaporesso', slug: 'vaporesso', category: 'Refillable Pod Systems', badge: 'AXON Chipset', puffs: 'Open System', skus: 45 },
  { name: 'SMOK', slug: 'smok', category: 'Hardware & Coils', badge: 'Industry Standard', puffs: 'Devices + Coils', skus: 90 },
  { name: 'OXBAR', slug: 'oxbar', category: 'Variable Wattage', badge: 'Fast Moving', puffs: '10K puffs', skus: 35 },
];

interface FeaturedBrandsProps {
  onSelectBrand?: (brandName: string) => void;
}

export const FeaturedBrands: React.FC<FeaturedBrandsProps> = ({ onSelectBrand }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const scrollCleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!listRef.current) return;
    const items = listRef.current.querySelectorAll<HTMLElement>('.brand-list-item');
    if (!items.length) return;

    // Set initial invisible state
    items.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(28px)';
    });

    // anime.js onScroll stagger
    const cleanup = onScroll({
      target: listRef.current,
      enter: 'top 90%',
      leave: 'bottom 0%',
      onEnter: () => {
        animate(items, {
          opacity: [0, 1],
          translateY: [28, 0],
          duration: 700,
          delay: stagger(55),
          ease: 'outExpo',
        });
      },
    });

    scrollCleanupRef.current = () => {
      if (typeof (cleanup as any)?.revert === 'function') (cleanup as any).revert();
    };

    return () => {
      scrollCleanupRef.current?.();
    };
  }, []);

  const handleClick = (name: string) => {
    if (onSelectBrand) onSelectBrand(name);
    const el = document.getElementById('inventory');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section id="brands" className="py-24 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.07) 0%, transparent 70%)' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
          <div className="max-w-xl">
            <span className="section-label mb-4 inline-flex">
              <Award className="w-3 h-3" />
              Oklahoma Authorized Portfolio
            </span>
            <h2 className="heading-1 mt-3" style={{ color: 'var(--text-primary)' }}>
              Featured Wholesale{' '}
              <span className="text-shimmer">Brands</span>
            </h2>
            <p className="body-lead mt-3 max-w-lg">
              Direct factory allocation for the industry&apos;s most in-demand brands. All
              stock dispatched from our central OKC warehouse.
            </p>
          </div>

          <div className="flex gap-6 shrink-0">
            {[
              { value: '50+', label: 'Brands' },
              { value: '900+', label: 'Active SKUs' },
              { value: '5.0★', label: 'Avg Rating' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-black" style={{ color: 'var(--accent-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.03em' }}>
                  {s.value}
                </div>
                <div className="label-overline mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Animated Brand List */}
        <div ref={listRef}>
          {BRANDS.map((brand, idx) => (
            <div
              key={brand.slug}
              onClick={() => handleClick(brand.name)}
              className="brand-list-item"
              style={{ position: 'relative' }}
            >
              <div className="flex items-center gap-4 sm:gap-8 py-5 px-2 sm:px-4">
                <span className="brand-number hidden sm:block tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
                <span className="brand-name flex-1">{brand.name}</span>
                <div className="hidden md:flex items-center gap-6 shrink-0">
                  <span className="label-overline">{brand.category}</span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent-primary)', border: '1px solid var(--accent-subtle-border)' }}>
                    {brand.badge}
                  </span>
                  <span className="label-overline">{brand.puffs}</span>
                  <span className="label-overline">{brand.skus} SKUs</span>
                </div>
                <span className="brand-arrow">
                  <ArrowRight className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                </span>
              </div>
              {brand.highlight && (
                <div className="absolute left-0 top-0 bottom-0 w-0.5"
                  style={{ background: 'var(--accent-primary)', opacity: 0.6 }} />
              )}
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 pt-8"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              Licensed Oklahoma Distributor
            </span>
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              Same-Day OKC Pickup
            </span>
            <span className="hidden sm:flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
              Volume Tier Pricing
            </span>
          </div>
          <a href="#inventory" className="btn-primary btn-glow text-sm" style={{ minWidth: '180px' }}>
            Browse All Products
            <ArrowRight className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default FeaturedBrands;
