import React, { useEffect, useRef, useState } from 'react';
import { 
  Zap, 
  Smartphone, 
  Crown, 
  Gem, 
  Shield, 
  RefreshCw, 
  Droplets, 
  Magnet, 
  Eye, 
  TrendingUp, 
  Gauge, 
  CheckCircle2, 
  ArrowRight,
  Maximize
} from 'lucide-react';

interface FeatureSpec {
  title: string;
  subtitle: string;
  icon: string;
}

interface SpotlightProduct {
  name: string;
  brand: string;
  tagline: string;
  description: string;
  puffs: string;
  features: FeatureSpec[];
  imageSrc: string;
  imageAlt: string;
  badge: string;
  accentColor: string;
  glowColor: string;
  bgBrandText: string;
  nextWatermark: string;
  slug: string;
}

const SPOTLIGHT_PRODUCTS: SpotlightProduct[] = [
  {
    name: 'Pulse X2',
    brand: 'GEEK BAR',
    tagline: 'Massive 50K capacity for heavy hitters.',
    description: 'The absolute unit of the Geek Bar lineup. Offering up to 50,000 puffs and a massive screen, it commands a premium retail price point and excellent margins.',
    puffs: '50,000 PUFFS',
    imageSrc: '/products/geekbar_pulse_x2_clean.png',
    imageAlt: 'Geek Bar Pulse X2',
    badge: '🚀 Top Tier',
    accentColor: '#2563EB',
    glowColor: 'rgba(37, 99, 235, 0.13)',
    bgBrandText: 'GEEK BAR',
    nextWatermark: 'PULSE X2',
    slug: 'geekbar-pulse-x2',
    features: [
      { title: '50K', subtitle: 'Puff Capacity', icon: 'zap' },
      { title: 'Large', subtitle: 'Wrap-Around Screen', icon: 'smartphone' },
      { title: 'Premium', subtitle: 'Retail Margins', icon: 'crown' },
      { title: 'High-End', subtitle: 'Build Quality', icon: 'gem' },
    ],
  },
  {
    name: 'American Standard',
    brand: 'AMERICAN STANDARD',
    tagline: 'A reliable, high-margin pod system.',
    description: 'An incredibly popular closed-pod system that guarantees repeat pod sales. Clean design, leak-resistant, and highly dependable for your regulars.',
    puffs: 'RECHARGEABLE KIT',
    imageSrc: '/products/american_standard_clean.png',
    imageAlt: 'American Standard Kit and Pod',
    badge: '🇺🇸 Premium Kit',
    accentColor: '#1E3A8A',
    glowColor: 'rgba(30, 58, 138, 0.12)',
    bgBrandText: 'AMERICAN',
    nextWatermark: 'FOGER',
    slug: 'american-standard',
    features: [
      { title: 'Durable', subtitle: 'Alloy Build', icon: 'shield' },
      { title: 'High Repeat', subtitle: 'Pod Sales', icon: 'refresh' },
      { title: 'Leak-Proof', subtitle: 'Pod Design', icon: 'droplets' },
      { title: 'Type-C', subtitle: 'Fast Charge', icon: 'zap' },
    ],
  },
  {
    name: 'Foger Kit & Pod',
    brand: 'FOGER',
    tagline: 'High margins. Fast turnover.',
    description: 'A swappable pod system with clear tank visibility that keeps customers coming back. This is a must-stock kit for any serious retail shop.',
    puffs: '30,000 PUFFS',
    imageSrc: '/products/foger_photo_clean.png',
    imageAlt: 'Foger Switch Pro Kit and Pod',
    badge: '⚡ High Turnover',
    accentColor: '#0D9488',
    glowColor: 'rgba(13, 148, 136, 0.14)',
    bgBrandText: 'FOGER',
    nextWatermark: 'iJOY 100K',
    slug: 'foger',
    features: [
      { title: 'MAGNETIC', subtitle: 'POD DOCK', icon: 'magnet' },
      { title: 'CLEAR', subtitle: 'TANK WINDOW', icon: 'eye' },
      { title: 'HIGH', subtitle: 'REPEAT SALES', icon: 'trending' },
      { title: 'FAST', subtitle: 'RETAIL TURNOVER', icon: 'gauge' },
    ],
  },
  {
    name: 'iJOY 100K',
    brand: 'iJOY',
    tagline: 'Up to 100,000 Puffs. Big Flavor. Premium Quality.',
    description: 'A premium device made for customers who want more. Engineered with an industry-first 100,000 puffs, dual-mode norm/boost firing, smart 2.0-inch digital display, and a dedicated 15mL refillable bottle dock. Stock up with Wholesale of Oklahoma.',
    puffs: '100,000 PUFFS',
    imageSrc: '/products/ijoy_100k_showcase.png',
    imageAlt: 'iJOY XP100K Disposable Vape Wholesale',
    badge: '🔥 100K Puffs',
    accentColor: '#16A34A',
    glowColor: 'rgba(22, 163, 74, 0.14)',
    bgBrandText: 'iJOY',
    nextWatermark: 'VOZOL',
    slug: 'ijoy-100k',
    features: [
      { title: '100K', subtitle: 'Puff Capacity', icon: 'zap' },
      { title: '33ML', subtitle: 'Kit + 15mL Bottle', icon: 'droplets' },
      { title: '2.0" SCREEN', subtitle: 'Smart Digital', icon: 'smartphone' },
      { title: 'DUAL MODE', subtitle: 'Norm & Boost', icon: 'gauge' },
    ],
  },
  {
    name: 'Rave 50000',
    brand: 'VOZOL',
    tagline: 'Unmatched 50K capacity and control.',
    description: 'A heavy-duty device featuring a modular pod design and 6-level wattage control. We have direct factory allocation for Oklahoma shops.',
    puffs: '50,000 PUFFS',
    imageSrc: '/products/vozol_50k_clean.png',
    imageAlt: 'VOZOL Rave 50000',
    badge: '★ Master Partner',
    accentColor: '#EA580C',
    glowColor: 'rgba(234, 88, 12, 0.13)',
    bgBrandText: 'VOZOL',
    nextWatermark: 'PULSE 2',
    slug: 'vozol',
    features: [
      { title: 'Modular', subtitle: 'Pod System', icon: 'zap' },
      { title: '6-Level', subtitle: 'Wattage Control', icon: 'gauge' },
      { title: 'Top Margin', subtitle: 'Retail Value', icon: 'crown' },
      { title: 'Direct Stock', subtitle: 'Factory Partner', icon: 'shield' },
    ],
  },
  {
    name: 'Pulse 2',
    brand: 'GEEK BAR',
    tagline: 'The newest addition to the Pulse family.',
    description: 'An upgraded 3D curved display and refined dual mesh coils make this the next big hit. Stock up early before local competitors catch on.',
    puffs: '25,000 PUFFS',
    imageSrc: '/products/geekbar_pulse_2_clean.png',
    imageAlt: 'Geek Bar Pulse 2',
    badge: '⭐ New Release',
    accentColor: '#10B981',
    glowColor: 'rgba(16, 185, 129, 0.13)',
    bgBrandText: 'PULSE 2',
    nextWatermark: 'PULSE X',
    slug: 'geekbar-pulse-2',
    features: [
      { title: '3D Curved', subtitle: 'Dome Screen', icon: 'smartphone' },
      { title: 'Upgraded', subtitle: 'VPU Tech', icon: 'zap' },
      { title: 'Strong', subtitle: 'Retail Demand', icon: 'trending' },
      { title: 'Extended', subtitle: 'Battery Life', icon: 'gem' },
    ],
  },
  {
    name: 'Pulse X 25K',
    brand: 'GEEK BAR',
    tagline: "World's First 3D Curved Screen Disposable.",
    description: "The next-generation evolution of the Pulse platform. Engineered with a dual-core VPU, 3D curved display, dual-mesh coil, and 18mL capacity delivering up to 25,000 regular puffs or 15,000 pulse mode puffs.",
    puffs: '25,000 PUFFS',
    imageSrc: '/products/geekbar_pulsex_25k_clean.png',
    imageAlt: 'Geek Bar Pulse X 25K Disposable',
    badge: '🚀 25K Curved',
    accentColor: '#2563EB',
    glowColor: 'rgba(37, 99, 235, 0.14)',
    bgBrandText: 'PULSE X',
    nextWatermark: 'PULSE 15K',
    slug: 'geekbar-pulse-x-25k',
    features: [
      { title: '25,000', subtitle: 'Puff Capacity', icon: 'zap' },
      { title: '3D Curved', subtitle: 'Dome Display', icon: 'smartphone' },
      { title: 'Dual Mesh', subtitle: 'Pulse Boost Mode', icon: 'gauge' },
      { title: 'Type-C', subtitle: 'Rapid Recharge', icon: 'refresh' },
    ],
  },
  {
    name: 'Pulse 15K',
    brand: 'GEEK BAR',
    tagline: 'The Legendary Original Full-Screen Disposable.',
    description: 'The device that revolutionized the modern disposable market. Features the signature full-capsule screen with cosmic animations, dual-mesh coils, 16mL e-liquid, regular (15K) and pulse (7.5K) modes, and unrivaled customer velocity.',
    puffs: '15,000 PUFFS',
    imageSrc: '/products/geekbar_pulse_15k_clean.png',
    imageAlt: 'Geek Bar Pulse 15K Disposable',
    badge: '🔥 Top Seller',
    accentColor: '#E11D48',
    glowColor: 'rgba(225, 29, 72, 0.13)',
    bgBrandText: 'PULSE 15K',
    nextWatermark: 'LOST MARY',
    slug: 'geekbar-pulse-15k',
    features: [
      { title: '15,000', subtitle: 'Standard Puffs', icon: 'zap' },
      { title: 'Full Screen', subtitle: 'Cosmic Display', icon: 'smartphone' },
      { title: 'Dual Core', subtitle: 'Dense Vapor', icon: 'gem' },
      { title: 'Top Rank', subtitle: 'Retail Velocity', icon: 'trending' },
    ],
  },
  {
    name: 'MT35000 Turbo',
    brand: 'LOST MARY',
    tagline: 'High-Capacity Dual Mode with Stealth Smart Display.',
    description: 'The high-capacity flagship of the Lost Mary family. Delivers up to 35,000 smooth puffs or 20,000 turbo puffs from 18mL of premium e-liquid, powered by a 1000mAh battery, dual mesh coils, and a discreet blend-in digital screen.',
    puffs: '35,000 PUFFS',
    imageSrc: '/products/lostmary_35k_clean.png',
    imageAlt: 'Lost Mary MT35000 Turbo Disposable',
    badge: '⚡ 35K Turbo',
    accentColor: '#7C3AED',
    glowColor: 'rgba(124, 58, 237, 0.14)',
    bgBrandText: 'LOST MARY',
    nextWatermark: 'NERA 70K',
    slug: 'lostmary-35k',
    features: [
      { title: '35,000', subtitle: 'Smooth Puffs', icon: 'zap' },
      { title: '1000mAh', subtitle: 'Long Battery Life', icon: 'gem' },
      { title: 'Dual Mode', subtitle: 'Smooth & Turbo', icon: 'gauge' },
      { title: 'Stealth', subtitle: 'Smart Display', icon: 'smartphone' },
    ],
  },
  {
    name: 'Nera Fullview 70K',
    brand: 'LOST MARY',
    tagline: 'Modular Dual-Pod Powerhouse with 3D Fullview Screen.',
    description: 'An industry-leading modular system featuring an 800mAh rechargeable base dock and two interchangeable 12mL prefilled pods. Delivers up to 70,000 total puffs with a panoramic 3D curved LED screen and high-margin repeat pod replenishment.',
    puffs: '70,000 PUFFS',
    imageSrc: '/products/lostmary_70k_clean.png',
    imageAlt: 'Lost Mary Nera Fullview 70K Modular Disposable Kit',
    badge: '💎 70K Modular',
    accentColor: '#0284C7',
    glowColor: 'rgba(2, 132, 199, 0.14)',
    bgBrandText: 'NERA 70K',
    nextWatermark: 'RAZ DC',
    slug: 'lostmary-70k',
    features: [
      { title: '70,000', subtitle: 'Dual Pod Total', icon: 'zap' },
      { title: '24mL', subtitle: 'Pre-Filled Liquid', icon: 'droplets' },
      { title: 'Fullview', subtitle: '3D Curved LED', icon: 'smartphone' },
      { title: 'Modular', subtitle: 'Repeat Pod Sales', icon: 'refresh' },
    ],
  },
  {
    name: 'RAZ DC25000',
    brand: 'RAZ',
    tagline: 'Mega HD Animation Screen & Dual Firing Control.',
    description: 'The undisputed customer favorite renowned for smooth airflow and deep flavor consistency. Packed with 16mL of authentic liquid, full HD animation screen, regular (25K) and boost (15K) modes, and genuine dark mode visuals.',
    puffs: '25,000 PUFFS',
    imageSrc: '/products/raz_25k_clean.png',
    imageAlt: 'RAZ DC25000 Disposable Vape',
    badge: '★ Top Shelf',
    accentColor: '#D97706',
    glowColor: 'rgba(217, 119, 6, 0.14)',
    bgBrandText: 'RAZ DC',
    nextWatermark: 'VOZOL VISTA',
    slug: 'raz-dc25000',
    features: [
      { title: '25,000', subtitle: 'Puff Capacity', icon: 'zap' },
      { title: 'Mega HD', subtitle: 'Display & Dark Mode', icon: 'smartphone' },
      { title: 'Dual Mode', subtitle: 'Boost & Normal', icon: 'gauge' },
      { title: 'High Demand', subtitle: 'Wholesale Favorite', icon: 'crown' },
    ],
  },
  {
    name: 'Vista 20000',
    brand: 'VOZOL',
    tagline: '6-Level Wattage Control & Cyberpunk Transparent Design.',
    description: 'The cutting-edge sensation with a transparent cyberpunk chassis and 6-level wattage dial. Delivers 20,000 puffs, dual mesh coils, full color digital screen, and customized vapor density from smooth to intense.',
    puffs: '20,000 PUFFS',
    imageSrc: '/products/vozol_vista_20k_clean.png',
    imageAlt: 'VOZOL Vista 20000 6-Level Wattage Disposable',
    badge: '⚡ 6-Level Wattage',
    accentColor: '#059669',
    glowColor: 'rgba(5, 150, 105, 0.14)',
    bgBrandText: 'VOZOL VISTA',
    nextWatermark: 'GEEK BAR',
    slug: 'vozol-vista-20000',
    features: [
      { title: '20,000', subtitle: 'Puff Capacity', icon: 'zap' },
      { title: '6-Level', subtitle: 'Wattage Dial', icon: 'gauge' },
      { title: 'Cyberpunk', subtitle: 'Clear Chassis', icon: 'eye' },
      { title: 'Dual Mesh', subtitle: 'S.i.L.C Tech', icon: 'gem' },
    ],
  },
];

// Helper hook for intersection observer to trigger animations
function useOnScreen(ref: React.RefObject<Element | null>, rootMargin = '0px') {
  const [isIntersecting, setIntersecting] = useState(false);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIntersecting(true);
        }
      },
      { rootMargin, threshold: 0.15 }
    );
    observer.observe(ref.current);
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
  return (
    <div className="bg-white dark:bg-[#0B0F19] overflow-hidden flex flex-col relative w-full">
      {SPOTLIGHT_PRODUCTS.map((product, i) => {
        const isEven = i % 2 === 0;
        return (
          <ProductAdvertisementSection 
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

interface ProductAdvertisementSectionProps {
  key?: string;
  product: SpotlightProduct;
  isEven: boolean;
  onSelectBrand?: (brandName: string) => void;
}

function ProductAdvertisementSection({ 
  product, 
  isEven, 
  onSelectBrand 
}: ProductAdvertisementSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isVisible = useOnScreen(ref, '-5%');

  // Progressive Animations
  const productArtworkAnim = isVisible
    ? 'opacity-100 translate-y-0 scale-100'
    : 'opacity-0 translate-y-8 scale-[0.96]';

  const brandWatermarkAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-5';

  const trustAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-3';

  const headingAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-4';

  const taglineAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-4';

  const descAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-5';

  const specsAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-5';

  const ctaAnim = isVisible
    ? 'opacity-100 translate-y-0'
    : 'opacity-0 translate-y-5';

  const renderIcon = (iconName: string) => {
    switch (iconName) {
      case 'zap':
        return <Zap className="w-6 h-6 stroke-[2.2]" />;
      case 'smartphone':
        return <Smartphone className="w-6 h-6 stroke-[2.2]" />;
      case 'crown':
        return <Crown className="w-6 h-6 stroke-[2.2]" />;
      case 'gem':
        return <Gem className="w-6 h-6 stroke-[2.2]" />;
      case 'shield':
        return <Shield className="w-6 h-6 stroke-[2.2]" />;
      case 'refresh':
        return <RefreshCw className="w-6 h-6 stroke-[2.2]" />;
      case 'droplets':
        return <Droplets className="w-6 h-6 stroke-[2.2]" />;
      case 'magnet':
        return <Magnet className="w-6 h-6 stroke-[2.2]" />;
      case 'eye':
        return <Eye className="w-6 h-6 stroke-[2.2]" />;
      case 'trending':
        return <TrendingUp className="w-6 h-6 stroke-[2.2]" />;
      case 'gauge':
        return <Gauge className="w-6 h-6 stroke-[2.2]" />;
      default:
        return <Zap className="w-6 h-6 stroke-[2.2]" />;
    }
  };

  return (
    <section 
      ref={ref}
      className="relative min-h-[700px] lg:min-h-[760px] w-full flex items-center justify-center overflow-hidden py-16 lg:py-24 bg-white dark:bg-[#0B0F19]"
      style={{
        contain: 'paint'
      }}
    >
      {/* ── Visual Layer 1: Giant Faded Brand Typography Behind Artwork ─── */}
      <div 
        className={`absolute inset-0 flex items-center pointer-events-none overflow-hidden select-none z-0 transition-all duration-1000 ease-out ${
          isEven ? 'justify-start pl-4 lg:pl-16' : 'justify-end pr-4 lg:pr-16'
        } ${brandWatermarkAnim}`}
        aria-hidden="true"
      >
        <span 
          className="text-[clamp(120px,14.5vw,230px)] font-black uppercase tracking-[-0.06em] leading-none whitespace-nowrap text-slate-900/[0.045] dark:text-white/[0.035]"
        >
          {product.bgBrandText}
        </span>
      </div>

      {/* ── Visual Layer 2: Soft Brand Atmospheric Glow ────────────────── */}
      <div 
        className="absolute inset-0 pointer-events-none transition-opacity duration-1000 z-0" 
        style={{ 
          background: `radial-gradient(ellipse 65% 55% at ${isEven ? '32%' : '68%'} 50%, ${product.glowColor}, rgba(112,65,255,0.02) 40%, transparent 70%)` 
        }} 
      />

      {/* ── Visual Density Grid (Max Width 1500px, 80-90% density) ─────── */}
      <div className={`relative z-10 w-full max-w-[1500px] mx-auto px-6 sm:px-10 lg:px-16 flex flex-col ${
        isEven ? 'lg:flex-row' : 'lg:flex-row-reverse'
      } items-center justify-between gap-10 lg:gap-6`}>
        
        {/* ── Product Artwork Showcase (52-55%) ────────────────────────── */}
        <div className={`w-full lg:w-[54%] flex items-center justify-center relative overflow-visible ${
          isEven ? 'lg:justify-end lg:-mr-12 xl:-mr-16' : 'lg:justify-start lg:-ml-12 xl:-ml-16'
        } z-20`}>
          <div 
            className={`w-full flex items-center justify-center transition-all duration-800 ease-[cubic-bezier(0.16,1,0.3,1)] ${productArtworkAnim}`}
          >
            <img 
              src={product.imageSrc} 
              alt={product.imageAlt} 
              loading="lazy"
              className="w-auto max-w-[95%] sm:max-w-[85%] lg:max-w-[115%] max-h-[500px] sm:max-h-[560px] lg:max-h-[640px] object-contain select-none pointer-events-none"
              style={{
                // Completely borderless, blends naturally with atmospheric glow
                filter: 'drop-shadow(0 20px 35px rgba(0,0,0,0.06))'
              }}
            />
          </div>
        </div>

        {/* ── Editorial Advertisement Copy (46-48%) ─────────────────────── */}
        <div className={`w-full lg:w-[46%] flex flex-col items-start relative z-30 ${
          isEven ? 'lg:pl-6 xl:pl-10' : 'lg:pr-6 xl:pr-10'
        }`}>

          {/* Top Verification Line */}
          <div 
            className={`flex items-center gap-2 text-[13px] font-semibold text-slate-500 dark:text-slate-400 mb-3.5 tracking-wide transition-all duration-700 delay-100 ease-out ${trustAnim}`}
          >
            <CheckCircle2 className="w-4 h-4 text-[#2563EB] stroke-[2.5]" />
            <span>Verified factory stock · OKC warehouse ready</span>
          </div>
          
          {/* Eyebrow: Brand & Puff Count */}
          <div 
            className={`text-[13px] sm:text-[14px] font-extrabold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 mb-2.5 transition-all duration-700 delay-150 ease-out ${headingAnim}`}
          >
            <span>{product.brand}</span>
            <span className="mx-2.5 font-normal text-slate-300 dark:text-slate-700">|</span>
            <span>{product.puffs}</span>
          </div>
          
          {/* Massive Product Heading */}
          <h2 
            className={`text-[clamp(56px,5.8vw,96px)] font-black leading-[0.92] tracking-[-0.055em] text-slate-950 dark:text-white mb-3 transition-all duration-700 delay-200 ease-out ${headingAnim}`}
          >
            {product.name}
          </h2>

          {/* Italic Brand-Colored Tagline */}
          <p 
            className={`text-[clamp(24px,2.3vw,31px)] font-bold italic tracking-tight mb-4 transition-all duration-700 delay-250 ease-out ${taglineAnim}`}
            style={{ color: product.accentColor }}
          >
            {product.tagline}
          </p>

          {/* Editorial Description */}
          <p 
            className={`text-[16px] sm:text-[17px] text-slate-600 dark:text-slate-300 leading-relaxed max-w-[540px] mb-8 font-normal transition-all duration-700 delay-300 ease-out ${descAnim}`}
          >
            {product.description}
          </p>

          {/* 4 Feature Specifications in a Single Row */}
          <div 
            className={`grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mb-10 w-full max-w-[560px] transition-all duration-700 delay-400 ease-out ${specsAnim}`}
          >
            {product.features.map((feat) => (
              <div key={feat.title} className="flex flex-col items-start">
                <div 
                  className="w-13 h-13 rounded-full flex items-center justify-center mb-3.5 bg-[#EBF3FF] dark:bg-blue-950/50"
                  style={{ color: product.accentColor }}
                >
                  {renderIcon(feat.icon)}
                </div>
                <span className="text-[16px] sm:text-[17px] font-black text-slate-950 dark:text-white leading-tight uppercase tracking-tight">
                  {feat.title}
                </span>
                <span className="text-[12px] sm:text-[13px] font-semibold text-slate-500 dark:text-slate-400 leading-tight mt-1">
                  {feat.subtitle}
                </span>
              </div>
            ))}
          </div>

          {/* Rounded Pill CTA + Verification Subtext */}
          <div 
            className={`flex flex-col items-start gap-3 transition-all duration-700 delay-500 ease-out ${ctaAnim}`}
          >
            <button
              type="button"
              onClick={() => {
                if (onSelectBrand) onSelectBrand(product.brand);
                const el = document.getElementById('inventory');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="h-[62px] px-10 rounded-full bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[16px] font-black tracking-wide inline-flex items-center gap-3 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <span>Order Wholesale</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center gap-2 text-[12px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2563EB] stroke-[2.5]" />
              <span>Verified factory stock · OKC warehouse ready</span>
            </div>
          </div>

        </div>
      </div>

      {/* ── Transition Watermark at Bottom (Connecting Magazine Flow) ─── */}
      <div 
        className={`absolute -bottom-6 ${isEven ? 'right-6 lg:right-16' : 'left-6 lg:left-16'} pointer-events-none select-none z-0 overflow-hidden`}
        aria-hidden="true"
      >
        <span className="text-[clamp(75px,10vw,150px)] font-black uppercase text-slate-900/[0.035] dark:text-white/[0.025] tracking-[-0.05em] leading-none whitespace-nowrap">
          {product.nextWatermark}
        </span>
      </div>
    </section>
  );
}
