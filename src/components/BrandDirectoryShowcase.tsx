import React, { useState } from 'react';
import {
  Award,
  ArrowRight,
  Lock,
  Package,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  Flame,
  Phone,
  Layers,
  ChevronRight,
} from 'lucide-react';

interface BrandItem {
  name: string;
  slug: string;
  tagline: string;
  category: 'Disposables' | 'Hardware & Mods' | 'E-Liquids' | 'Botanicals & Kratom' | 'Glass & Smoke Essentials';
  badge?: string;
  heroImage: string;
  galleryImages: string[];
  specs: {
    capacity?: string;
    highlights: string[];
    topModels: string[];
  };
  inStockCount: number;
  glowColor?: string;
}

const BRAND_DIRECTORY: BrandItem[] = [
  {
    name: 'Geek Bar',
    slug: 'geekbar',
    tagline: 'World-Leading Dual-Mesh Full-Screen Smart Hardware',
    category: 'Disposables',
    badge: '🔥 #1 Best Seller in Oklahoma',
    heroImage: '/products/geekbar-15k.png',
    galleryImages: ['/products/geekbar-15k.png', '/products/geekbar-25k.png', '/products/geekbar-60k.png'],
    specs: {
      capacity: '15,000 – 60,000 Puffs',
      highlights: ['Pulse Mode Boost', 'Full HD Display Screen', 'Dual Core Mesh Coils'],
      topModels: ['Pulse 15k', 'Pulse X 25k', 'Pulse Ultra 60k', 'Digiflavor Sky'],
    },
    inStockCount: 132,
    glowColor: 'rgba(255, 107, 0, 0.18)',
  },
  {
    name: 'VOZOL',
    slug: 'vozol',
    tagline: 'Premier Factory Direct Master Wholesale Allocation',
    category: 'Disposables',
    badge: '★ Master Partner',
    heroImage: '/products/vozol-50k.png',
    galleryImages: ['/products/vozol-50k.png'],
    specs: {
      capacity: 'Up to 50,000 Puffs',
      highlights: ['Modular Pod System', '6-Level Wattage Tuning', 'Party Ambient Screen'],
      topModels: ['Mega 50K Kit & Pod', 'Rave 50000', 'Vista 20000', 'Gear Power 20K'],
    },
    inStockCount: 80,
    glowColor: 'rgba(59, 130, 246, 0.16)',
  },
  {
    name: 'Foger',
    slug: 'foger',
    tagline: 'Swappable Pod Disposables & Magnetized Base Tech',
    category: 'Disposables',
    badge: '⚡ High Turnover',
    heroImage: '/products/foger-30k.jpg',
    galleryImages: ['/products/foger-30k.jpg'],
    specs: {
      capacity: '30,000 Puffs Modular',
      highlights: ['Magnetic Battery Dock', 'Clear Tank Visibility', 'Eco-Friendly Pod Swaps'],
      topModels: ['Switch Pro 30K', 'Switch Pro Pods', 'CT10000', 'Ultra 6000'],
    },
    inStockCount: 75,
    glowColor: 'rgba(16, 185, 129, 0.16)',
  },
  {
    name: 'RAZ',
    slug: 'raz',
    tagline: 'Genuine Leather Chassis & HD Animation Interface',
    category: 'Disposables',
    badge: 'Top Wholesale Velocity',
    heroImage: '/products/raz-25k.png',
    galleryImages: ['/products/raz-25k.png', '/products/raz-pod.png'],
    specs: {
      capacity: 'Up to 50,000 Puffs',
      highlights: ['Genuine Leather Grip', 'HD Animation Display', 'Vape-While-Charging'],
      topModels: ['DC25000', 'TN9000 Dream', 'LTX 25K Heavy Duty', 'Vue 50K Modular'],
    },
    inStockCount: 85,
    glowColor: 'rgba(217, 119, 6, 0.16)',
  },
  {
    name: 'Lost Mary',
    slug: 'lost-mary',
    tagline: 'Iconic Flavor Consistency & Turbo Dual-Heating',
    category: 'Disposables',
    badge: 'Retail Staple',
    heroImage: '/products/lostmary-mt15000.png',
    galleryImages: ['/products/lostmary-mt15000.png', '/products/lostmary-os5000.png'],
    specs: {
      capacity: '5,000 – 20,000 Puffs',
      highlights: ['Thermal Color-Changing Body', 'Smooth Dual Mode', 'Ergonomic Pocket Fit'],
      topModels: ['MT15000 Turbo', 'OS5000 Luster', 'MO20000 Pro', 'BM6000'],
    },
    inStockCount: 75,
    glowColor: 'rgba(236, 72, 153, 0.15)',
  },
  {
    name: 'OXBAR',
    slug: 'oxbar',
    tagline: 'Pod Juice Collabs & Precision Adjustable Wattage',
    category: 'Disposables',
    badge: 'Collab Exclusive',
    heroImage: '/products/oxbar-magic-maze.png',
    galleryImages: ['/products/oxbar-magic-maze.png'],
    specs: {
      capacity: '10,000 – 30,000 Puffs',
      highlights: ['Official Pod Juice Flavors', 'Variable Wattage Control', 'Airflow Slider'],
      topModels: ['Magic Maze 2.0 30K', 'Magic Maze Pro 10K'],
    },
    inStockCount: 50,
    glowColor: 'rgba(168, 85, 247, 0.16)',
  },
  {
    name: 'Vaporesso',
    slug: 'vaporesso',
    tagline: 'Precision Pod Systems & AXON Chipset Technology',
    category: 'Hardware & Mods',
    badge: 'Industry Standard',
    heroImage: '/products/vaporesso-xros-4.png',
    galleryImages: ['/products/vaporesso-xros-4.png', '/products/vaporesso-xros-pods.jpg'],
    specs: {
      capacity: 'COREX 2.0 Mesh Pods',
      highlights: ['Pulse Mode Chipset', 'Anti-Leaking SSS Tech', '0.4Ω to 1.2Ω Pod Range'],
      topModels: ['XROS 4 Pod Kit', 'XROS Pro', 'Luxe XR Max 80W', 'COREX Pod 4pks'],
    },
    inStockCount: 22,
    glowColor: 'rgba(14, 165, 233, 0.16)',
  },
  {
    name: 'SMOK',
    slug: 'smok',
    tagline: 'High-Demand Starter Kits, Pod Devices & Replacement Coils',
    category: 'Hardware & Mods',
    badge: 'Top Replacement SKUs',
    heroImage: '/products/smok-novo-5.png',
    galleryImages: ['/products/smok-novo-5.png', '/products/smok-nord-5.png', '/products/smok-nord-coils.png'],
    specs: {
      capacity: 'Universal Pods & Coils',
      highlights: ['Button / Draw Activation', 'Variable Wattage OLED', 'Wide Coil Ecosystem'],
      topModels: ['Novo 5 Kit', 'Nord 5 80W', 'RPM Mesh Coils', 'LP1 Coils'],
    },
    inStockCount: 30,
    glowColor: 'rgba(239, 68, 68, 0.15)',
  },
  {
    name: 'Coastal Clouds & Naked 100',
    slug: 'coastal-clouds',
    tagline: 'Top-Selling Freebase 60ml/100ml & High-Velocity Salt Nic 30ml',
    category: 'E-Liquids',
    badge: 'Retail Staple',
    heroImage: '/products/coastal-clouds-60ml.png',
    galleryImages: ['/products/coastal-clouds-60ml.png', '/products/coastal-clouds-salts-30ml.png', '/products/naked100-60ml.png'],
    specs: {
      capacity: '30ml Salt / 60ml & 100ml Freebase',
      highlights: ['USA Manufactured E-Liquid', 'Strict Batch Testing', 'Full Nicotine Gradients'],
      topModels: ['Blood Orange Mango', 'Hawaiian POG', 'Apple Peach Strawberry', 'Lava Flow'],
    },
    inStockCount: 95,
    glowColor: 'rgba(6, 182, 212, 0.16)',
  },
  {
    name: 'OPMS & Pure Botanicals',
    slug: 'opms',
    tagline: 'The Gold Standard in Cold-Water Kratom Liquid Extracts & Alkaloids',
    category: 'Botanicals & Kratom',
    badge: 'Highest Counter Margin',
    heroImage: '/products/opms-gold-liquid-extract.jpg',
    galleryImages: ['/products/opms-gold-liquid-extract.jpg', '/products/opms-black-liquid-extract.jpg', '/products/kratom-capsules-maeng-da.jpg'],
    specs: {
      capacity: '8.8ml Extracts & Blister Packs',
      highlights: ['Proprietary Cold Extraction', 'Anti-Tamper Packaging', '12ct Counter Displays'],
      topModels: ['OPMS Gold Liquid Shot', 'OPMS Black Shot', 'Gold Capsules', 'MIT45 Shots'],
    },
    inStockCount: 35,
    glowColor: 'rgba(234, 179, 8, 0.18)',
  },
  {
    name: 'RAW & King Palm',
    slug: 'raw',
    tagline: 'Authentic Natural Unrefined Rolling Papers, Pre-Rolled Cones & Displays',
    category: 'Glass & Smoke Essentials',
    badge: '100% Genuine Guaranteed',
    heroImage: '/products/raw-classic-king-size-box.png',
    galleryImages: ['/products/raw-classic-king-size-box.png', '/products/king-palm-cones-display.png'],
    specs: {
      capacity: 'Retail Counter Boxes & Tubs',
      highlights: ['Authentic QR Verification', 'Unrefined Plant Fibers', 'Full Master Cartons'],
      topModels: ['RAW Classic King Size', 'RAW Black Cones 1-1/4', 'King Palm Slims', 'RAW 800ct Tubs'],
    },
    inStockCount: 45,
    glowColor: 'rgba(180, 83, 9, 0.18)',
  },
  {
    name: 'Diamond Glass & Smoke Hardware',
    slug: 'diamond-glass',
    tagline: 'Heavy-Wall 7mm/9mm Borosilicate Beakers, Rigs & Smoke Supplies',
    category: 'Glass & Smoke Essentials',
    badge: 'Direct Factory Allocation',
    heroImage: '/products/glass-beaker-10in.jpg',
    galleryImages: ['/products/glass-beaker-10in.jpg', '/products/scorch-torch-triple-jet.jpg', '/products/precision-digital-scale-001g.jpg'],
    specs: {
      capacity: '10" to 16" Heavy Glass',
      highlights: ['7mm & 9mm Borosilicate', 'Multi-Jet Torches', 'Precision 0.01g Digital Scales'],
      topModels: ['Heavy Beaker 12"', 'Matrix Recycler', 'Scorch Torches', 'Newport Zero 12pk'],
    },
    inStockCount: 35,
    glowColor: 'rgba(99, 102, 241, 0.16)',
  },
];

const FILTER_CATEGORIES = [
  'All Brands',
  'Disposables',
  'Hardware & Mods',
  'E-Liquids',
  'Botanicals & Kratom',
  'Glass & Smoke Essentials',
];

interface BrandDirectoryShowcaseProps {
  isLoggedIn?: boolean;
  hasCatalogAccess?: boolean;
  onBrandClick: (brandName: string) => void;
  onOpenLogin: () => void;
  onOpenApplication: () => void;
}

export const BrandDirectoryShowcase: React.FC<BrandDirectoryShowcaseProps> = ({
  isLoggedIn = false,
  hasCatalogAccess,
  onBrandClick,
  onOpenLogin,
  onOpenApplication,
}) => {
  const hasAccess = Boolean(hasCatalogAccess ?? isLoggedIn);
  const [selectedFilter, setSelectedFilter] = useState('All Brands');
  const [hoveredBrand, setHoveredBrand] = useState<string | null>(null);

  const filteredBrands = selectedFilter === 'All Brands'
    ? BRAND_DIRECTORY
    : BRAND_DIRECTORY.filter((b) => b.category === selectedFilter);

  const handleBrandSelect = (brandName: string) => {
    if (hasAccess) {
      onBrandClick(brandName);
    } else {
      onOpenLogin();
    }
  };

  return (
    <section
      id="brands"
      className="py-16 sm:py-24 relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-slate-100 dark:from-[#080C14] dark:via-[#0B0F19] dark:to-[#070A10] text-slate-900 dark:text-white transition-colors duration-300"
    >
      {/* ── Background Subtle Lighting Mesh ── */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/4 w-[600px] h-[400px] bg-gradient-to-br from-[#FF6B00]/10 via-[#FF6B00]/5 to-transparent blur-[120px] rounded-full" />
        <div className="absolute -bottom-32 right-1/4 w-[600px] h-[400px] bg-gradient-to-tl from-orange-400/10 via-amber-500/5 to-transparent blur-[140px] rounded-full" />
        <div className="absolute inset-0 bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] dark:bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:24px_24px] opacity-35" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-12 sm:space-y-16">
        
        {/* ── Section Header with Metallic Shimmer ── */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          {/* Shimmering Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider bg-white/90 dark:bg-slate-900/90 text-[#FF6B00] border border-orange-200/80 dark:border-orange-500/30 shadow-sm backdrop-blur-md">
            <Award className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Oklahoma Wholesale Brand Directory</span>
          </div>

          {/* Prominent Glossy Heading */}
          <div className="relative inline-block">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight leading-tight">
              <span className="text-slate-900 dark:text-white">Official Wholesale </span>
              <span className="bg-gradient-to-r from-[#FF6B00] via-[#FF8C33] to-[#FF5500] bg-clip-text text-transparent drop-shadow-xs">
                Brand Directory
              </span>
            </h2>
            {/* Shimmer light sweep line */}
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-32 h-[3px] bg-gradient-to-r from-transparent via-[#FF6B00] to-transparent rounded-full shadow-sm shadow-orange-500/50" />
          </div>

          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto pt-2">
            Direct warehouse distribution for Oklahoma’s highest-velocity smoke and vape brands.
            Explore authentic manufacturer product lines with guaranteed batch verification and direct OKC warehouse dispatch.
          </p>

          {/* ── Polished Floating Filter Tabs ── */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
            {FILTER_CATEGORIES.map((cat) => {
              const isActive = selectedFilter === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedFilter(cat)}
                  className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs font-bold transition-all duration-200 cursor-pointer select-none flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#FF6B00] to-[#E85F00] text-white shadow-lg shadow-orange-500/25 scale-[1.03]'
                      : 'bg-white/80 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/90 dark:border-slate-800/90 backdrop-blur-md shadow-2xs hover:border-orange-300 dark:hover:border-orange-500/40'
                  }`}
                >
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Brand Showcase Grid (Cohesive Modern Glass Cards) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredBrands.map((brand) => {
            const isHovered = hoveredBrand === brand.slug;

            return (
              <div
                key={brand.slug}
                onMouseEnter={() => setHoveredBrand(brand.slug)}
                onMouseLeave={() => setHoveredBrand(null)}
                className="group relative rounded-3xl transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-default
                  bg-white/90 dark:bg-[#0E1524]/90 
                  border border-slate-200/80 dark:border-white/[0.08] 
                  hover:border-[#FF6B00]/60 dark:hover:border-[#FF6B00]/70
                  shadow-md hover:shadow-2xl hover:shadow-orange-500/10 
                  backdrop-blur-xl hover:-translate-y-1.5"
              >
                {/* Ambient Radial Spotlight (per-brand color tone) */}
                <div
                  className="absolute -top-24 -right-24 w-64 h-64 rounded-full blur-[80px] pointer-events-none transition-opacity duration-500"
                  style={{
                    backgroundColor: brand.glowColor || 'rgba(255,107,0,0.15)',
                    opacity: isHovered ? 1 : 0.45,
                  }}
                />

                {/* Subtle top reflective rim highlight */}
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none" />

                {/* ── CARD BODY (Unified, No Brick Slices) ── */}
                <div className="p-6 sm:p-7 space-y-5 relative z-10 flex-1 flex flex-col justify-between">
                  
                  {/* Top Header Row */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-200/70 dark:border-slate-700/60">
                        {brand.category}
                      </span>
                      {brand.badge && (
                        <span className="text-[10px] font-black text-[#FF6B00] bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800/60 px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                          {brand.badge}
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight group-hover:text-[#FF6B00] transition-colors duration-200">
                        {brand.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {brand.tagline}
                      </p>
                    </div>
                  </div>

                  {/* ── Seamless Product Hero Stage ── */}
                  <div className="py-4 my-1 relative flex items-center justify-center min-h-[190px]">
                    {/* Glowing radial backdrop circle */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-40 h-40 rounded-full bg-gradient-to-b from-slate-100 to-slate-200/50 dark:from-slate-800/50 dark:to-slate-900/30 blur-sm scale-90 group-hover:scale-110 transition-transform duration-500" />
                    </div>

                    {/* Product Image Cluster (Protected for Approved Accounts) */}
                    {hasAccess ? (
                      <div className="relative z-10 flex items-center justify-center gap-3">
                        {brand.galleryImages.map((imgSrc, idx) => (
                          <div
                            key={idx}
                            className={`relative rounded-2xl bg-white/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-white/10 p-3 shadow-sm backdrop-blur-sm transition-all duration-300 ${
                              idx === 0
                                ? 'w-36 h-36 sm:w-40 sm:h-40 group-hover:scale-105 group-hover:shadow-lg'
                                : 'w-20 h-20 hidden sm:flex opacity-75 group-hover:opacity-100'
                            } flex items-center justify-center`}
                          >
                            <img
                              src={imgSrc}
                              alt={`${brand.name} product`}
                              className="max-h-full max-w-full object-contain filter drop-shadow-md transition-transform duration-300 group-hover:scale-105"
                              loading="lazy"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/products/geekbar-15k.png';
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center justify-center p-4 text-center space-y-2">
                        <div className="w-14 h-14 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[#FF6B00] shadow-inner">
                          <Lock className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 tracking-tight">
                          Product Line Protected
                        </span>
                        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 max-w-[170px]">
                          Approved Oklahoma retailers only. Log in to view models & live inventory.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* ── Integrated Metadata & Model Highlights ── */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                        Top Models:
                      </span>
                      <span className="text-[#FF6B00] font-mono text-[11px] font-black">
                        {brand.specs.capacity || `${brand.inStockCount}+ SKUs`}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {brand.specs.topModels.map((model, idx) => (
                        <span
                          key={idx}
                          className="bg-slate-100/90 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/50 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-colors group-hover:border-orange-300/60 dark:group-hover:border-orange-500/30"
                        >
                          {model}
                        </span>
                      ))}
                    </div>

                    {/* Advantage Bullets */}
                    <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {brand.specs.highlights.slice(0, 2).map((h, idx) => (
                        <span key={idx} className="flex items-center gap-1.5 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                          <span className="truncate">{h}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                </div>

                {/* ── Glossy Action Footer Trigger ── */}
                <div className="p-5 pt-0 relative z-10">
                  <button
                    type="button"
                    onClick={() => handleBrandSelect(brand.name)}
                    className="w-full bg-slate-900 hover:bg-[#FF6B00] dark:bg-white/[0.07] dark:hover:bg-[#FF6B00] text-white text-xs font-extrabold py-3.5 px-4 rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-lg hover:shadow-orange-500/25 cursor-pointer group/btn active:scale-[0.98]"
                  >
                    {hasAccess ? (
                      <>
                        <Package className="w-4 h-4 text-[#FF6B00] group-hover/btn:text-white transition-colors" />
                        <span>View {brand.name} Catalog & Pricing</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-[#FF6B00] group-hover/btn:text-white transition-colors" />
                        <span>Login to Access {brand.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Polished Metallic B2B Retailer Gateway Card ── */}
        <div className="relative rounded-3xl p-7 sm:p-10 overflow-hidden border border-orange-200 dark:border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-white to-orange-500/5 dark:from-[#131C2E] dark:via-[#0E1524] dark:to-[#17130F] shadow-xl text-slate-900 dark:text-white mt-8">
          {/* Subtle metallic diagonal sheen */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 bg-orange-100 dark:bg-orange-950/60 text-[#FF6B00] border border-orange-200 dark:border-orange-800/80 text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
                <span>Verified Retailer Gateway</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                Browse <span className="bg-gradient-to-r from-[#FF6B00] to-[#FF8C33] bg-clip-text text-transparent">900+ Products</span> With Live Tier Pricing
              </h3>

              <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed max-w-2xl">
                Log in to your authorized wholesale account to view live inventory levels, master case rates, and place orders directly.
              </p>

              <div className="flex flex-wrap gap-4 pt-1 text-xs font-bold text-slate-600 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                  Oklahoma Licensed Wholesaler
                </span>
                <span className="flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-[#FF6B00]" />
                  900+ In-Stock SKUs with Images
                </span>
                <span className="flex items-center gap-1.5">
                  <Flame className="w-4 h-4 text-[#FF6B00]" />
                  Same-Day OKC Warehouse Pickup
                </span>
              </div>
            </div>

            <div className="lg:col-span-4 flex flex-col gap-3 justify-center">
              {hasAccess ? (
                <a
                  href="#catalog"
                  className="w-full bg-gradient-to-r from-[#FF6B00] to-[#E85F00] hover:from-[#E85F00] hover:to-[#D15200] text-white text-sm font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] text-center uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  <span>Browse 900+ Master SKUs</span>
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="w-full bg-gradient-to-r from-[#FF6B00] to-[#E85F00] hover:from-[#E85F00] hover:to-[#D15200] text-white text-sm font-extrabold py-4 px-6 rounded-2xl transition-all shadow-lg shadow-orange-500/25 hover:scale-[1.02] active:scale-[0.98] text-center uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Customer Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenApplication}
                    className="w-full bg-white dark:bg-slate-800/90 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 text-sm font-bold py-3.5 px-6 rounded-2xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:border-[#FF6B00]"
                  >
                    <UserCheck className="w-4 h-4 text-[#FF6B00]" />
                    <span>Apply for Wholesale Account</span>
                  </button>

                  <a
                    href="tel:4057682975"
                    className="text-center text-xs text-slate-500 dark:text-slate-400 hover:text-[#FF6B00] transition-colors flex items-center justify-center gap-1.5 pt-1"
                  >
                    <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                    <span>Need immediate onboarding? (405) 768-2975</span>
                  </a>
                </>
              )}
            </div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default BrandDirectoryShowcase;
