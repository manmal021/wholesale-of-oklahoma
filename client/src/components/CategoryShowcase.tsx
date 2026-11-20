import React, { useState, useEffect } from 'react';
import { ArrowRight, Layers, Wind, Cpu, Droplet, ShieldCheck, Box } from 'lucide-react';
import { fetchInventoryMeta } from '../lib/inventoryApi';

interface CategoryShowcaseProps {
  onSelectCategory?: (category: string) => void;
}

const CATEGORY_DETAILS: Record<string, { icon: React.ElementType; tagline: string; description: string; badge?: string; img: string }> = {
  'Disposables': {
    icon: Wind,
    tagline: 'High-Capacity Smart Hardware',
    description: 'Top-moving 10K to 50K puff disposables with dual-mesh coils, digital displays, and master carton case pricing.',
    badge: 'High Velocity',
    img: '/products/geekbar-25k.png'
  },
  'Pod Systems': {
    icon: Cpu,
    tagline: 'Refillable Open Hardware',
    description: 'Popular retail pod devices, AXON chipsets, adjustable wattage, and replacement cartridge inventory.',
    badge: 'Popular',
    img: '/products/foger-30k.jpg'
  },
  'Hardware & Tanks': {
    icon: Box,
    tagline: 'Hardware, Mods & Sub-Ohm Tanks',
    description: 'Industry-standard mods, starter kits, and sub-ohm tank hardware from trusted manufacturers.',
    img: '/products/vozol-50k.png'
  },
  'E-Liquid': {
    icon: Droplet,
    tagline: 'Premium Freebase & Nic Salts',
    description: 'Compliant bottled vape juices and salt nicotine formulations in leading flavor profiles.',
    img: '/products/geekbar-25k.png'
  },
};

export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({ onSelectCategory }) => {
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryMeta()
      .then((meta) => {
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
    window.dispatchEvent(new CustomEvent('woo-select-category', { detail: catName }));
    const inventorySection = document.getElementById('inventory');
    if (inventorySection) {
      inventorySection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (!loading && activeCategories.length === 0) return null;

  return (
    <section id="categories" className="py-20 lg:py-32 bg-[#F9F9F8] text-slate-900 border-y border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Editorial Section Header */}
        <div className="mb-16 max-w-2xl">
          <h2 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight mb-6" style={{ lineHeight: 0.95 }}>
            Master <span className="text-[#FF6B00]">Catalog</span> Categories
          </h2>
          <p className="text-lg sm:text-xl text-slate-600 font-medium">
            Explore authentic wholesale inventory ready for immediate OKC warehouse pickup or statewide dispatch.
          </p>
        </div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {activeCategories.map((cat, idx) => {
            const details = CATEGORY_DETAILS[cat] || {
              icon: Box,
              tagline: 'Wholesale Retail Supply',
              description: 'Authentic wholesale inventory.',
              img: ''
            };
            
            // Asymmetric sizing logic
            const isLarge = idx === 0;
            const isMedium = idx === 1;
            
            const colSpan = isLarge ? 'md:col-span-2' : isMedium ? 'md:col-span-1' : 'md:col-span-1';
            const rowSpan = isLarge ? 'md:row-span-2' : 'md:row-span-1';

            return (
              <div
                key={cat}
                onClick={() => handleCategoryClick(cat)}
                className={`group relative overflow-hidden bg-white rounded-3xl cursor-pointer ${colSpan} ${rowSpan} min-h-[300px] shadow-sm hover:shadow-2xl transition-all duration-500`}
              >
                {/* Image Background */}
                <div className="absolute inset-0 bg-slate-100 z-0">
                  {details.img && (
                    <img
                      src={details.img}
                      alt={cat}
                      className="w-full h-full object-cover object-center opacity-40 group-hover:opacity-70 group-hover:scale-110 transition-all duration-700 ease-in-out mix-blend-multiply"
                    />
                  )}
                  {/* Overlay gradient */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${isLarge ? 'from-slate-900/90 via-slate-900/40' : 'from-slate-900/80 via-slate-900/20'} to-transparent`} />
                </div>

                {/* Content */}
                <div className="absolute inset-0 p-8 flex flex-col justify-end z-10 text-white">
                  {details.badge && (
                    <div className="mb-auto self-start">
                      <span className="text-xs font-black uppercase tracking-wider bg-[#FF6B00] text-white px-3 py-1.5 rounded-full shadow-lg">
                        {details.badge}
                      </span>
                    </div>
                  )}

                  <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                    <span className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-2 block">
                      {details.tagline}
                    </span>
                    <h3 className={`font-black tracking-tight mb-3 ${isLarge ? 'text-4xl lg:text-5xl' : 'text-3xl'}`}>
                      {cat}
                    </h3>
                    <p className={`text-slate-300 font-medium line-clamp-2 ${isLarge ? 'text-lg max-w-md' : 'text-sm'}`}>
                      {details.description}
                    </p>
                    
                    <div className="mt-6 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <span className="text-sm font-bold text-[#FF6B00]">Browse Products</span>
                      <ArrowRight className="w-4 h-4 text-[#FF6B00]" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default CategoryShowcase;
