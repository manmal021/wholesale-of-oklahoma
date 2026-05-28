import React, { useState } from 'react';
import { Sparkles, Check, Package, ShoppingBag, TrendingUp, Info, Phone, MessageSquare, Mail, CornerRightDown } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  brand: 'Geekbar' | 'Raz' | 'Foger' | 'Vozol';
  puffs?: string;
  nicotine?: string;
  features: string[];
  flavours: string[];
  popular: boolean;
  basePriceRange: string;
  pricePerUnit: number;
}

export default function ProductCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'Geekbar' | 'Raz' | 'Foger' | 'Vozol'>('All');

  // High-circulating products available right now (Geekbar, Raz, Foger, and Vozol)
  const products: Product[] = [
    {
      id: 'geekbar-15k',
      name: 'Geekbar Pulse 15k',
      brand: 'Geekbar',
      puffs: '15,000 Puffs',
      nicotine: '5%',
      features: ['Dual Mesh Coil', 'Full Screen Display', 'Pulse Mode Boost', 'High Profit Margin'],
      flavours: ['Fucking Fab', 'Blow Pop', 'Sour Apple Blow Pop', 'Watermelon Ice', 'Strawberry Banana'],
      popular: true,
      basePriceRange: '$6.50 / unit',
      pricePerUnit: 6.50,
    },
    {
      id: 'geekbar-25k',
      name: 'Geekbar Pulse X 25k',
      brand: 'Geekbar',
      puffs: '25,000 Puffs',
      nicotine: '5%',
      features: ['World\'s 1st 3D Curved Screen', 'Advanced Dual Core', 'Fast Charge Capable', 'Dispensary Top Pick'],
      flavours: ['Sour Mango Pineapple', 'Watermelon Ice', 'Sour apple ice', 'starwberry b pop', 'Miami Mint'],
      popular: true,
      basePriceRange: '$8.20 / unit',
      pricePerUnit: 8.20,
    },
    {
      id: 'geekbar-60k',
      name: 'Geekbar Pulse Ultra 60k (kit & pod)',
      brand: 'Geekbar',
      puffs: '60,000 Puffs',
      nicotine: '5%',
      features: ['Extended High-Capacity Tank', 'Triple Mesh Technology', 'Interactive Fluid Indicator', 'Max Hand Feel'],
      flavours: ['Blue Straws', 'Triple Berry', 'Cool Mint', 'Maimi Mint', 'Strawberry Watermelon'],
      popular: true,
      basePriceRange: '$12.00 / unit',
      pricePerUnit: 12.00,
    },
    {
      id: 'raz-25k',
      name: 'Rz Ltx 25k',
      brand: 'Raz',
      puffs: '25,000 Puffs',
      nicotine: '5%',
      features: ['Genuine Leather Texture Grip', 'HD Animation Screen', 'Adjustable Dual Airflow', 'Smoke Shop Classic'],
      flavours: ['Night Crawler', 'Mango Ice', 'Georgia Peach', 'Blueberry Watermelon', 'Blue Razz gush'],
      popular: true,
      basePriceRange: '$7.90 / unit',
      pricePerUnit: 7.90,
    },
    {
      id: 'foger-30k',
      name: 'Foger 30K Kit & Pod',
      brand: 'Foger',
      puffs: '30,000 Puffs',
      nicotine: '5%',
      features: ['Dynamic Pod Kit Setup', 'Interchangeable Cartridges', 'Eco-Boost Core Technology', 'Premium Vapor Density'],
      flavours: ['Strawberry Watermelon', 'Blue Razz Ice', 'Gummy Bear', 'Gum Mint', 'Sour Apple Ice'],
      popular: true,
      basePriceRange: '$9.50 / unit',
      pricePerUnit: 9.50,
    },
    {
      id: 'vozol-50k',
      name: 'Vozol 50K Kit & Pod',
      brand: 'Vozol',
      puffs: '50,000 Puffs',
      nicotine: '5%',
      features: ['Ultimate 50k High-Capacity Pack', 'Vozol Smart Air Control', 'Rapid Charge Capability', 'Dual Core Flavor Preservation'],
      flavours: ['Watermelon razz rancher', 'Cool Mint', 'Hawian Pineapple paradise', 'miami mint', 'Blue raz ice'],
      popular: true,
      basePriceRange: '$11.00 / unit',
      pricePerUnit: 11.00,
    }
  ];

  const filteredProducts = selectedCategory === 'All'
    ? products
    : products.filter(p => p.brand === selectedCategory);

  const handleOrderNowClick = (prodId?: string) => {
    // Scroll smoothly to order section
    const element = document.getElementById('direct-order-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="how" className="py-16 md:py-24 bg-[#f5f5f4] text-[#1f2a1d] px-4 sm:px-6 md:px-10 border-t border-[#1f2a1d]/5">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#3d5638] mb-2">
              <TrendingUp className="w-4 h-4 text-[#85AB8B]" />
              <span className="text-sm font-semibold tracking-wide uppercase">Top Selling Inventory</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-[#1f2a1d] tracking-tight">
              Best Sellers <span className="text-[#85AB8B]">in Stock Now</span>
            </h2>
            <p className="mt-3 text-[#4b5b47] max-w-xl text-sm sm:text-base">
              The highest-circulating premium devices for Oklahoma dispensaries and smoke shops. Available for same-day local OKC pickup or rapid ship.
            </p>
          </div>

          {/* Filtering buttons */}
          <div className="flex items-center gap-2 p-1 bg-white/60 border border-white rounded-full self-start md:self-auto shadow-sm">
            {(['All', 'Geekbar', 'Raz', 'Foger', 'Vozol'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all cursor-pointer ${selectedCategory === cat
                    ? 'bg-[#1f2a1d] text-white shadow-sm'
                    : 'text-[#4b5b47] hover:bg-neutral-200/50'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Cards Grid with Editorial Aesthetic */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <div
              key={prod.id}
              className="group relative bg-white/60 backdrop-blur-xl rounded-[32px] p-6 border border-white hover:border-[#336443]/15 transition-all duration-300 hover:shadow-md flex flex-col justify-between"
            >
              {prod.popular && (
                <div className="absolute top-4 right-4 bg-[#336443]/10 text-[#336443] font-semibold text-[10px] px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  STORES TOP PICK
                </div>
              )}

              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider text-[#85AB8B]">{prod.brand} series</span>
                <h3 className="text-xl sm:text-2xl font-bold text-[#1f2a1d] mt-1 group-hover:text-[#336443] transition-colors">
                  {prod.name}
                </h3>
                {prod.puffs && (
                  <div className="inline-block mt-2 bg-[#1f2a1d] text-[#f7f9f6] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                    {prod.puffs}
                  </div>
                )}
                <div className="mt-4 space-y-2">
                  {prod.features.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-[#4b5b47] py-1 border-b border-[#1f2a1d]/5 last:border-0">
                      <Check className="w-3.5 h-3.5 text-[#336443] mt-0.5 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-[#1f2a1d]/60 mb-2">Popular Flavors:</h4>
                  <div className="flex flex-wrap gap-1">
                    {prod.flavours.map((flv, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-medium bg-white/80 px-2 py-0.5 rounded-lg border border-neutral-200/50 text-[#4b5b47]"
                      >
                        {flv}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-5 border-t border-neutral-200/60 w-full">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] block text-[#4b5b47]/75 uppercase tracking-widest font-bold">Direct Wholesale</span>
                    <span className="font-semibold text-xs text-[#3d5638] flex items-center gap-1">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      In Stock OKC
                    </span>
                  </div>
                  <button
                    onClick={() => handleOrderNowClick(prod.id)}
                    className="bg-[#1f2a1d] hover:bg-[#336443] text-white text-xs font-bold px-4 py-2.5 rounded-full transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <span>Order Now</span>
                    <CornerRightDown className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
