import React, { useState, useEffect } from 'react';
import { ArrowRight, Layers, Wind, Cpu, Droplet, ShieldCheck, Box } from 'lucide-react';
import { fetchInventoryMeta } from '../lib/inventoryApi';

interface CategoryShowcaseProps {
  onSelectCategory?: (category: string) => void;
}

interface CategoryCardInfo {
  name: string;
  icon: React.ElementType;
  tagline: string;
  description: string;
  badge?: string;
}

const CATEGORY_DETAILS: Record<string, { icon: React.ElementType; tagline: string; description: string; badge?: string }> = {
  'Disposables': {
    icon: Wind,
    tagline: 'High-Capacity Smart Hardware',
    description: 'Top-moving 10K to 50K puff disposables with dual-mesh coils, digital displays, and master carton case pricing.',
    badge: 'High Velocity',
  },
  'Pod Systems': {
    icon: Cpu,
    tagline: 'Refillable Open Hardware',
    description: 'Popular retail pod devices, AXON chipsets, adjustable wattage, and replacement cartridge inventory.',
    badge: 'Popular',
  },
  'Hardware & Tanks': {
    icon: Box,
    tagline: 'Hardware, Mods & Sub-Ohm Tanks',
    description: 'Industry-standard mods, starter kits, and sub-ohm tank hardware from trusted manufacturers.',
  },
  'E-Liquid': {
    icon: Droplet,
    tagline: 'Premium Freebase & Nic Salts',
    description: 'Compliant bottled vape juices and salt nicotine formulations in leading flavor profiles.',
  },
};

export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ onSelectCategory }) => {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryMeta()
      .then((meta) => {
        // Only show categories that have active inventory items
        if (meta && meta.categories && meta.categories.length > 0) {
          setActiveCategories(meta.categories);
        } else {
          setActiveCategories(['Disposables', 'Pod Systems', 'Hardware & Tanks', 'E-Liquid']);
        }
      })
      .catch(() => {
        setActiveCategories(['Disposables', 'Pod Systems', 'Hardware & Tanks', 'E-Liquid']);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCategoryClick = (catName: string) => {
    if (onSelectCategory) {
      onSelectCategory(catName);
    }
    // Also dispatch event for inventory section to capture
    window.dispatchEvent(new CustomEvent('woo-select-category', { detail: catName }));
    const inventorySection = document.getElementById('inventory');
    if (inventorySection) {
      inventorySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!loading && activeCategories.length === 0) return null;

  return (
    <section id="categories" className="py-20 bg-white text-slate-900 border-t border-slate-200 relative overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute -top-40 right-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 left-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full mb-3 shadow-xs">
            <Layers className="w-3.5 h-3.5" />
            <span>Curated Wholesale Inventory</span>
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
            Wholesale <span className="text-[#FF6B00]">Product Categories</span>
          </h2>
          <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
            Direct warehouse stock for Wholesale of Oklahoma retail partners, convenience stores, and dispensaries. Only active, in-stock catalog categories are listed.
          </p>
        </div>

        {/* Dynamic Category Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {activeCategories.map((cat) => {
            const details = CATEGORY_DETAILS[cat] || {
              icon: Box,
              tagline: 'Wholesale Retail Supply',
              description: 'Authentic wholesale inventory ready for immediate OKC warehouse pickup or statewide dispatch.',
            };
            const Icon = details.icon;

            return (
              <div
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className="group bg-slate-50 hover:bg-white rounded-2xl p-6 border border-slate-200 hover:border-[#FF6B00]/60 transition-all duration-300 hover:shadow-xl flex flex-col justify-between cursor-pointer"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-[#FF6B00] group-hover:scale-110 transition-transform shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    {details.badge && (
                      <span className="text-[10px] font-bold text-[#FF6B00] bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
                        {details.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#FF6B00] transition-colors">
                    {cat}
                  </h3>
                  <span className="text-xs font-semibold text-[#FF6B00] block mt-0.5">
                    {details.tagline}
                  </span>

                  <p className="text-xs text-slate-600 mt-2.5 leading-relaxed">
                    {details.description}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-[#FF6B00] group-hover:text-[#E85F00] flex items-center gap-1 transition-colors">
                    <span>Browse {cat}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">OKC Stock</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Category Trust Note */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
            Direct Factory Master Cartons
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
            Authentic Scratch-Off QR Verifications
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
            Volume Tier Pricing for Retailers
          </span>
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
