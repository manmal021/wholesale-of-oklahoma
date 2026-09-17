import React, { useState } from 'react';
import {
  ShieldCheck,
  Award,
  ArrowRight,
  Lock,
  Package,
  Layers,
  Sparkles,
  Phone,
  UserCheck,
  CheckCircle2,
  ChevronRight,
  Flame,
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
      highlights: ['Official Pod Juice Juice Flavors', 'Variable Wattage Control', 'Airflow Slider'],
      topModels: ['Magic Maze 2.0 30K', 'Magic Maze Pro 10K'],
    },
    inStockCount: 50,
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
  isLoggedIn: boolean;
  onBrandClick: (brandName: string) => void;
  onOpenLogin: () => void;
  onOpenApplication: () => void;
}

export const BrandDirectoryShowcase: React.FC<BrandDirectoryShowcaseProps> = ({
  isLoggedIn,
  onBrandClick,
  onOpenLogin,
  onOpenApplication,
}) => {
  const [selectedFilter, setSelectedFilter] = useState('All Brands');

  const filteredBrands = selectedFilter === 'All Brands'
    ? BRAND_DIRECTORY
    : BRAND_DIRECTORY.filter((b) => b.category === selectedFilter);

  const handleBrandSelect = (brandName: string) => {
    if (isLoggedIn) {
      onBrandClick(brandName);
    } else {
      // Prompt retailer login to view the 900+ items and active pricing
      onOpenLogin();
    }
  };

  return (
    <section id="brands" className="py-20 bg-[#F8FAFC] text-slate-900 relative overflow-hidden border-t border-slate-200">
      {/* Ambient glowing backdrop */}
      <div className="absolute top-1/4 -left-64 w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-64 w-[500px] h-[500px] bg-[#FF6B00]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 space-y-16">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-xs">
            <Award className="w-4 h-4 text-[#FF6B00]" />
            <span>Oklahoma Wholesale Brand Directory</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
            Official Wholesale <span className="text-[#FF6B00]">Brands & Hardware</span>
          </h2>

          <p className="text-slate-600 text-sm sm:text-base md:text-lg leading-relaxed">
            Direct warehouse distribution for Oklahoma’s highest-velocity smoke and vape brands.
            Explore authentic manufacturer product lines with guaranteed batch verification and direct OKC warehouse dispatch.
          </p>

          {/* Category Filter Pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2">
            {FILTER_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedFilter(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  selectedFilter === cat
                    ? 'bg-[#FF6B00] text-white shadow-md scale-105'
                    : 'bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Brand Grid Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredBrands.map((brand) => (
            <div
              key={brand.slug}
              className="group bg-white rounded-3xl border border-slate-200 hover:border-[#FF6B00]/70 transition-all duration-300 shadow-sm hover:shadow-xl flex flex-col justify-between overflow-hidden"
            >
              {/* Card Header with Badges */}
              <div className="p-6 pb-4 border-b border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    {brand.category}
                  </span>
                  {brand.badge && (
                    <span className="text-[10px] font-black text-[#FF6B00] bg-orange-50 border border-orange-200 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      {brand.badge}
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-2xl font-black text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {brand.tagline}
                  </p>
                </div>
              </div>

              {/* Product Visual Showcase Renders */}
              <div className="px-6 py-6 bg-slate-50/60 flex items-center justify-center relative min-h-[220px]">
                {/* Visual Glow */}
                <div className="absolute inset-0 bg-radial from-[#FF6B00]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-center justify-center gap-3 z-10">
                  {brand.galleryImages.map((imgSrc, idx) => (
                    <div
                      key={idx}
                      className={`relative rounded-2xl bg-white border border-slate-200 p-3 shadow-xs transition-transform duration-300 group-hover:scale-105 ${
                        idx === 0 ? 'w-36 h-36 sm:w-40 sm:h-40' : 'w-24 h-24 hidden sm:flex'
                      } flex items-center justify-center`}
                    >
                      <img
                        src={imgSrc}
                        alt={`${brand.name} product`}
                        className="max-h-full max-w-full object-contain filter drop-shadow-sm"
                        loading="lazy"
                        onError={(e) => {
                          // Fallback to geekbar-15k if not found
                          (e.target as HTMLImageElement).src = '/products/geekbar-15k.png';
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Model & Spec Highlights */}
              <div className="p-6 pt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                      Top Wholesale Models:
                    </span>
                    <span className="text-[#FF6B00] font-mono text-[11px] font-bold">
                      {brand.specs.capacity || `${brand.inStockCount}+ SKUs`}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {brand.specs.topModels.map((model, idx) => (
                      <span
                        key={idx}
                        className="bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                      >
                        {model}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Key Advantages */}
                <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] text-slate-500">
                  {brand.specs.highlights.slice(0, 2).map((h, idx) => (
                    <span key={idx} className="flex items-center gap-1.5 truncate">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF6B00] shrink-0" />
                      <span className="truncate">{h}</span>
                    </span>
                  ))}
                </div>

                {/* Action Trigger */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => handleBrandSelect(brand.name)}
                    className="w-full bg-slate-100 hover:bg-[#FF6B00] text-slate-800 hover:text-white border border-slate-200 hover:border-[#FF6B00] text-xs font-bold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 shadow-xs cursor-pointer group/btn"
                  >
                    {isLoggedIn ? (
                      <>
                        <Package className="w-4 h-4 text-[#FF6B00] group-hover/btn:text-white transition-colors" />
                        <span>View {brand.name} Catalog & Pricing</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-[#FF6B00] group-hover/btn:text-white transition-colors" />
                        <span>Login to View {brand.name} Products</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* B2B Retailer Gateway Call-to-Action Card */}
        <div className="bg-gradient-to-r from-orange-50/90 via-white to-orange-50/50 rounded-3xl p-8 sm:p-12 border-2 border-orange-200 shadow-xl relative overflow-hidden text-slate-900">
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-[#FF6B00]/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-8 space-y-4">
              <div className="inline-flex items-center gap-2 bg-orange-100 text-[#FF6B00] border border-orange-200 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full">
                <Lock className="w-3.5 h-3.5" />
                <span>Verified Retailer Gateway</span>
              </div>

              <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900">
                Access All <span className="text-[#FF6B00]">900+ Products</span> Imported from Zoho with Live Tier Pricing
              </h3>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
                Wholesale of Oklahoma operates a closed wholesale distribution network exclusively for licensed Wholesale of Oklahoma retail partners, dispensaries, vape stores, and commercial retailers. 
                Log in to your account to instantly browse full Zoho inventory stock levels, master case rates, and volume discounts.
              </p>

              <div className="flex flex-wrap gap-4 pt-2 text-xs font-semibold text-slate-600">
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
              {isLoggedIn ? (
                <a
                  href="#inventory"
                  className="w-full bg-[#FF6B00] hover:bg-[#E85F00] text-white text-sm font-extrabold py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-center uppercase tracking-wider flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  <span>Browse 900+ Inventory Items</span>
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenLogin}
                    className="w-full bg-[#FF6B00] hover:bg-[#E85F00] text-white text-sm font-extrabold py-4 px-6 rounded-2xl transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95 text-center uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-5 h-5" />
                    <span>Customer Login</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenApplication}
                    className="w-full bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 hover:border-[#FF6B00] text-sm font-bold py-3.5 px-6 rounded-2xl transition-all text-center flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                  >
                    <UserCheck className="w-4 h-4 text-[#FF6B00]" />
                    <span>Apply for Wholesale Account</span>
                  </button>

                  <a
                    href="tel:4057682975"
                    className="text-center text-xs text-slate-500 hover:text-[#FF6B00] transition-colors flex items-center justify-center gap-1.5 pt-1"
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
