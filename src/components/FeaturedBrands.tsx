import React from 'react';
import { ArrowRight, ShieldCheck, Flame, Award } from 'lucide-react';

interface Brand {
  name: string;
  slug: string;
  tagline: string;
  category: string;
  featured?: boolean;
  highlight?: string;
  popularProducts: string[];
}

const BRANDS: Brand[] = [
  {
    name: 'VOZOL',
    slug: 'vozol',
    tagline: 'Premier Wholesale Distribution Partner for Oklahoma',
    category: 'High-Capacity Disposables',
    featured: true,
    highlight: '#1 Wholesale Partner',
    popularProducts: ['Rave 50000', 'Vista 20000', 'Gear Power 20K', 'Star 12000'],
  },
  {
    name: 'Geek Bar',
    slug: 'geek-bar',
    tagline: 'Leading Dual-Mesh Full-Screen Hardware',
    category: 'Smart Disposables',
    highlight: 'Top Seller',
    popularProducts: ['Pulse 15000', 'Pulse X 25000', 'Digiflavor Sky'],
  },
  {
    name: 'Foger',
    slug: 'foger',
    tagline: 'Premium Magnetic Pod & Smart Screen System',
    category: 'Swappable Pod Disposables',
    highlight: 'Fast Moving',
    popularProducts: ['Switch Pro 30K', 'CT10000', 'Ultra 6000'],
  },
  {
    name: 'Lost Mary',
    slug: 'lost-mary',
    tagline: 'Iconic Flavor Profiles & Ergonomic Form Factor',
    category: 'Disposables',
    popularProducts: ['MT15000 Turbo', 'OS5000', 'MO20000 Pro'],
  },
  {
    name: 'RAZ',
    slug: 'raz',
    tagline: 'HD Animation Display with Premium Mesh Coils',
    category: 'High-End Disposables',
    popularProducts: ['DC25000', 'TN9000', 'CA6000'],
  },
  {
    name: 'SMOK',
    slug: 'smok',
    tagline: 'Industry-Standard Hardware, Pods & Coils',
    category: 'Hardware & Coils',
    popularProducts: ['Novo Series', 'Nord 5', 'RPM Replacement Coils'],
  },
  {
    name: 'Vaporesso',
    slug: 'vaporesso',
    tagline: 'Precision Pod Systems & AXON Chipset Tech',
    category: 'Refillable Open Systems',
    popularProducts: ['XROS 4', 'XROS Pro', 'Luxe XR Max'],
  },
  {
    name: 'OXBAR',
    slug: 'oxbar',
    tagline: 'Adjustable Wattage Disposables by Pod Juice',
    category: 'Variable Wattage',
    popularProducts: ['Magic Maze 2.0', 'Magic Maze Pro 10K'],
  },
];

interface FeaturedBrandsProps {
  onSelectBrand?: (brandSlug: string) => void;
}

export const FeaturedBrands: React.FC<FeaturedBrandsProps> = ({ onSelectBrand }) => {
  const handleBrandClick = (slug: string, brandName: string) => {
    if (onSelectBrand) {
      onSelectBrand(brandName);
    }
    const inventorySection = document.getElementById('inventory');
    if (inventorySection) {
      inventorySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const vozol = BRANDS.find((b) => b.slug === 'vozol')!;
  const otherBrands = BRANDS.filter((b) => b.slug !== 'vozol');

  return (
    <section id="brands" className="py-20 bg-[#F8FAFC] text-slate-900 relative overflow-hidden border-t border-slate-200">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 -left-48 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-48 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full mb-4 shadow-xs">
            <Award className="w-3.5 h-3.5" />
            <span>Authorized Oklahoma Wholesale Portfolio</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Featured Wholesale <span className="text-[#FF6B00]">Brands</span>
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
            Direct warehouse distribution for the industry&apos;s most requested brands. Guaranteed authentic stock dispatched directly from Oklahoma City.
          </p>
        </div>

        {/* Priority Brand Spotlight: VOZOL (#1 Placement) */}
        <div className="mb-10 bg-white rounded-3xl p-6 sm:p-10 text-slate-900 shadow-xl border border-slate-200 relative overflow-hidden group">
          {/* Subtle accent gradient background */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-radial from-[#FF6B00]/10 via-transparent to-transparent opacity-70 pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="bg-[#FF6B00] text-white text-[11px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-xs">
                  ★ Premier Distribution Partner
                </span>
                <span className="bg-slate-50 text-slate-700 text-xs font-semibold px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Direct Factory Allocation
                </span>
              </div>

              <h3 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
                VOZOL <span className="text-[#FF6B00]">Wholesale</span> Oklahoma
              </h3>

              <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-2xl">
                Wholesale of Oklahoma is a primary wholesale distribution channel for authentic VOZOL hardware in the region. Full cases, high-velocity SKU restocks, and multi-tier volume pricing available for licensed convenience stores, dispensaries, and Wholesale of Oklahoma retail partners.
              </p>

              {/* Popular VOZOL Models */}
              <div className="pt-2">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block mb-2">
                  Featured Master Series in Stock:
                </span>
                <div className="flex flex-wrap gap-2">
                  {vozol.popularProducts.map((p, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 transition-colors"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleBrandClick('vozol', 'VOZOL')}
                  className="bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-full transition-all shadow-md hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <span>Filter VOZOL Products</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="/brands/vozol"
                  onClick={(e) => {
                    e.preventDefault();
                    handleBrandClick('vozol', 'VOZOL');
                  }}
                  className="bg-white hover:bg-slate-50 text-slate-800 text-xs sm:text-sm font-semibold px-5 py-3 rounded-full border border-slate-300 transition-colors shadow-xs"
                >
                  View Brand Overview
                </a>
              </div>
            </div>

            {/* VOZOL Right Badge Card */}
            <div className="lg:col-span-5 flex flex-col items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#FF6B00]/10 border border-[#FF6B00]/30 flex items-center justify-center text-[#FF6B00] shadow-xs">
                <Flame className="w-8 h-8" />
              </div>
              <div className="text-2xl font-black text-slate-900">Full Case Master Cartons</div>
              <p className="text-xs text-slate-600 max-w-xs">
                Fresh factory master cartons with verified scratch-off anti-counterfeit QR codes on every unit.
              </p>
              <div className="w-full pt-3 border-t border-slate-200 grid grid-cols-2 gap-2 text-center text-xs">
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[#FF6B00] font-extrabold block">OKC Stock</span>
                  <span className="text-slate-500 text-[11px]">Ready for Dispatch</span>
                </div>
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[#FF6B00] font-extrabold block">Volume Tier</span>
                  <span className="text-slate-500 text-[11px]">Master Carton Deals</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Other Major Brands Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {otherBrands.map((brand) => (
            <div
              key={brand.slug}
              className="group bg-white rounded-2xl p-5 border border-slate-200 hover:border-[#FF6B00]/60 transition-all duration-300 hover:shadow-xl flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                    {brand.category}
                  </span>
                  {brand.highlight && (
                    <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                      {brand.highlight}
                    </span>
                  )}
                </div>

                <h4 className="text-xl font-bold text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                  {brand.name}
                </h4>

                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {brand.tagline}
                </p>

                {/* Popular models */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1.5">
                    Popular Models:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {brand.popularProducts.map((prod, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                      >
                        {prod}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => handleBrandClick(brand.slug, brand.name)}
                  className="text-xs font-bold text-[#FF6B00] group-hover:text-[#E85F00] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Browse {brand.name}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
                <span className="text-[10px] font-mono text-slate-500">OKC Stock</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedBrands;
