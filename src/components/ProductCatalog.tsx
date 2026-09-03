import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Check,
  Package,
  ShoppingBag,
  TrendingUp,
  Phone,
  Search,
  CheckCircle2,
  CornerRightDown,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { PRODUCTS, type WholesaleProduct, type ProductCategory } from '../lib/productDatabase';
import { addToOrderDirect, getDraftOrder } from '../lib/mangoAI';

const CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'All', label: 'All Best Sellers', icon: '🔥' },
  { id: 'Disposable Vapes', label: 'Disposable Vapes', icon: '💨' },
  { id: 'Vape Mods & Kits', label: 'Vape Mods & Kits', icon: '⚙️' },
  { id: 'Vape Juice', label: 'Vape Juices', icon: '💧' },
  { id: 'Pipes & Glass', label: 'Pipes & Glass', icon: '🧪' },
  { id: 'THCA, CBD & Delta', label: 'THCA, CBD & Delta', icon: '🌿' },
  { id: 'Kratom', label: 'Kratom', icon: '🍃' },
  { id: 'Novelties', label: 'Novelties', icon: '⚖️' },
  { id: 'Accessories', label: 'Accessories', icon: '👑' },
];

const MOD_SUBCATEGORIES = [
  { id: 'All Hardware', label: 'All Hardware' },
  { id: 'Devices Kit', label: 'Devices Kit' },
  { id: 'Pod', label: 'Pod Systems & Pods' },
  { id: 'Battery', label: '510 Batteries' },
  { id: 'Coils', label: 'Replacement Coils' },
];

interface CatalogCardProps {
  prod: WholesaleProduct;
  onAdded: (name: string, qty: number) => void;
}

const CatalogCard: React.FC<CatalogCardProps> = ({ prod, onAdded }) => {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handleAddToCart = () => {
    addToOrderDirect(prod.id, qty);
    setAdded(true);
    onAdded(prod.name, qty);
    setTimeout(() => setAdded(false), 2500);
  };

  const handleScrollToForm = () => {
    const el = document.getElementById('direct-order-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="group relative bg-white/70 backdrop-blur-xl rounded-[32px] p-6 border border-white hover:border-[#336443]/25 transition-all duration-300 hover:shadow-xl flex flex-col justify-between">
      {/* Top badges */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs uppercase font-extrabold tracking-wider text-[#85AB8B]">
            {prod.brand}
          </span>
          {prod.badge && (
            <span className="bg-amber-100/90 border border-amber-300 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full shadow-2xs">
              {prod.badge}
            </span>
          )}
          {prod.subcategory && (
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-[9px] font-semibold px-2 py-0.5 rounded">
              {prod.subcategory}
            </span>
          )}
        </div>
        <span className="text-[11px] font-bold text-[#336443] shrink-0 bg-emerald-50/80 px-2 py-0.5 rounded-full border border-emerald-100">
          Call for Price
        </span>
      </div>

      {/* Main Details */}
      <div className="flex-1">
        <h3 className="text-xl sm:text-2xl font-bold text-[#1f2a1d] leading-snug group-hover:text-[#336443] transition-colors">
          {prod.name}
        </h3>

        {/* Spec badges */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {prod.puffs && (
            <span className="bg-[#1f2a1d] text-[#f7f9f6] text-[10px] font-bold px-2 py-0.5 rounded uppercase">
              {prod.puffs}
            </span>
          )}
          {prod.size && (
            <span className="bg-[#85AB8B]/20 text-[#1f2a1d] text-[10px] font-bold px-2 py-0.5 rounded">
              {prod.size}
            </span>
          )}
          {prod.nicotine && (
            <span className="bg-neutral-100 text-neutral-600 text-[10px] font-medium px-2 py-0.5 rounded">
              {prod.nicotine}
            </span>
          )}
          <span className="text-[10px] text-neutral-400 ml-auto font-mono">
            {prod.sku}
          </span>
        </div>

        {/* Feature bullets */}
        <div className="mt-4 space-y-1.5">
          {prod.features.slice(0, 3).map((feat, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs text-[#4b5b47] py-0.5">
              <Check className="w-3.5 h-3.5 text-[#336443] mt-0.5 shrink-0" />
              <span className="leading-tight">{feat}</span>
            </div>
          ))}
        </div>

        {/* Flavors / Variants */}
        {prod.flavours && prod.flavours.length > 0 && (
          <div className="mt-4">
            <h4 className="text-[11px] font-semibold text-[#1f2a1d]/70 mb-1.5">
              Popular Flavors & Options:
            </h4>
            <div className="flex flex-wrap gap-1">
              {prod.flavours.slice(0, 4).map((flv, idx) => (
                <span
                  key={idx}
                  className="text-[10px] font-medium bg-white/90 px-2 py-0.5 rounded-lg border border-neutral-200/60 text-[#4b5b47]"
                >
                  {flv}
                </span>
              ))}
              {prod.flavours.length > 4 && (
                <span className="text-[10px] text-neutral-400 self-center">
                  +{prod.flavours.length - 4} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-6 pt-4 border-t border-neutral-200/60 w-full space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div>
            <span className="text-[10px] block text-[#4b5b47]/75 uppercase tracking-widest font-bold">
              Direct Wholesale
            </span>
            <span className="font-semibold text-xs text-[#3d5638] flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              In Stock OKC
            </span>
          </div>
          <a
            href="tel:4057682975"
            className="text-[11px] font-bold text-[#336443] hover:underline flex items-center gap-1"
          >
            <Phone className="w-3 h-3" />
            (405) 768-2975
          </a>
        </div>

        {/* Quantity Selector + Add to Cart */}
        <div className="flex items-center gap-2">
          {/* Stepper + Dropdown 1-20 */}
          <div className="flex items-center gap-1 bg-white border border-neutral-200 rounded-full px-2 py-1 shadow-2xs">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              className="w-5 h-5 rounded-full bg-neutral-100 text-[#1f2a1d] font-bold text-xs flex items-center justify-center hover:bg-neutral-200 disabled:opacity-30 transition-colors cursor-pointer"
            >
              −
            </button>
            <select
              value={qty}
              onChange={(e) => setQty(Number(e.target.value))}
              aria-label="Select quantity"
              className="bg-transparent text-xs font-bold text-[#1f2a1d] border-0 outline-none cursor-pointer px-1"
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'unit' : 'units'}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(20, q + 1))}
              disabled={qty >= 20}
              className="w-5 h-5 rounded-full bg-neutral-100 text-[#1f2a1d] font-bold text-xs flex items-center justify-center hover:bg-neutral-200 disabled:opacity-30 transition-colors cursor-pointer"
            >
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            type="button"
            onClick={handleAddToCart}
            className={`flex-1 py-2 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
              added ? 'bg-emerald-600' : 'bg-[#1f2a1d] hover:bg-[#336443]'
            }`}
          >
            {added ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added {qty} to Cart!
              </>
            ) : (
              <>
                <ShoppingBag className="w-3.5 h-3.5" />
                Add to Cart
              </>
            )}
          </button>
        </div>

        {/* Quick order form scroll button */}
        <button
          type="button"
          onClick={handleScrollToForm}
          className="w-full text-center text-[10px] font-bold uppercase tracking-wider text-[#4b5b47] hover:text-[#1f2a1d] transition-colors py-0.5 flex items-center justify-center gap-1 cursor-pointer"
        >
          <span>Or Submit via Form Below</span>
          <CornerRightDown className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export default function ProductCatalog() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>('All Hardware');
  const [searchQuery, setSearchQuery] = useState('');
  const [cartCount, setCartCount] = useState(0);
  const [lastAddedNotice, setLastAddedNotice] = useState<string | null>(null);

  const updateCartCount = () => {
    const items = getDraftOrder();
    setCartCount(items.reduce((s, i) => s + i.quantity, 0));
  };

  useEffect(() => {
    updateCartCount();
    const handleCart = () => updateCartCount();
    window.addEventListener('mango-cart-updated', handleCart);
    return () => window.removeEventListener('mango-cart-updated', handleCart);
  }, []);

  const handleItemAdded = (name: string, qty: number) => {
    updateCartCount();
    setLastAddedNotice(`Added ${qty}x ${name} to your wholesale cart!`);
    setTimeout(() => setLastAddedNotice(null), 3500);
  };

  const handleOpenMangoCart = () => {
    window.dispatchEvent(new CustomEvent('open-mango-cart'));
  };

  const filteredProducts = PRODUCTS.filter((p) => {
    let matchesCategory = selectedCategory === 'All' ? p.popular : p.category === selectedCategory;

    if (selectedCategory === 'Vape Mods & Kits' && selectedSubcategory !== 'All Hardware') {
      matchesCategory = matchesCategory && p.subcategory === selectedSubcategory;
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesCategory;

    const haystack = [
      p.name,
      p.brand,
      p.sku,
      p.category,
      p.subcategory || '',
      p.size || '',
      ...p.flavours,
      ...p.features,
    ].join(' ').toLowerCase();

    return matchesCategory && haystack.includes(q);
  });

  return (
    <section id="how" className="py-16 md:py-24 bg-[#f5f5f4] text-[#1f2a1d] px-4 sm:px-6 md:px-10 border-t border-[#1f2a1d]/5 relative">
      {/* Toast notification when item added from page */}
      {lastAddedNotice && (
        <div className="fixed top-24 right-6 z-40 bg-[#1f2a1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-white/10 flex items-center gap-3 animate-fade-in">
          <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="text-xs">
            <div className="font-bold">{lastAddedNotice}</div>
            <div className="text-[10px] text-neutral-300">Updated in your Mango wholesale order</div>
          </div>
          <button
            onClick={handleOpenMangoCart}
            className="ml-2 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>View Cart</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between mb-10 gap-6">
          <div>
            <div className="flex items-center gap-2 text-[#3d5638] mb-2">
              <TrendingUp className="w-4 h-4 text-[#85AB8B]" />
              <span className="text-xs sm:text-sm font-semibold tracking-wide uppercase">
                Licensed Oklahoma Wholesaler · OKC Metro
              </span>
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold text-[#1f2a1d] tracking-tight">
              Best Sellers <span className="text-[#85AB8B]">in Stock Now</span>
            </h2>
            <p className="mt-3 text-[#4b5b47] max-w-2xl text-sm sm:text-base leading-relaxed">
              Explore Oklahoma's highest-circulating wholesale catalog. From high-demand disposables, pod kits, coils, and premium vape juice to borosilicate glass, THCA diamonds, and authentic O.P.M.S. kratom. Select 1-20 units and add straight to cart!
            </p>
          </div>

          {/* Cart status badge on desktop */}
          {cartCount > 0 && (
            <button
              onClick={handleOpenMangoCart}
              className="bg-[#1f2a1d] hover:bg-[#2c3d2a] text-white px-5 py-3 rounded-full shadow-lg flex items-center gap-2.5 transition-all self-start lg:self-auto cursor-pointer border border-white/10 group"
            >
              <ShoppingBag className="w-4 h-4 text-[#85AB8B] group-hover:scale-110 transition-transform" />
              <div className="text-left text-xs leading-tight">
                <span className="block font-bold">Wholesale Cart</span>
                <span className="text-[10px] text-[#85AB8B] font-semibold">{cartCount} items selected</span>
              </div>
              <ArrowRight className="w-4 h-4 ml-1 text-neutral-400 group-hover:text-white transition-colors" />
            </button>
          )}
        </div>

        {/* Filter Bar & Search */}
        <div className="bg-white/80 backdrop-blur-md rounded-3xl p-4 border border-white shadow-sm mb-8 space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Geekbar, Raz, XROS, Juice Head, Glass, THCA, OPMS, RAW..."
              className="w-full bg-[#f5f5f4] border border-neutral-200 rounded-full pl-10 pr-4 py-2 text-xs sm:text-sm text-[#1f2a1d] focus:outline-none focus:border-[#85AB8B] transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-neutral-400 hover:text-neutral-600 absolute right-3 top-1/2 -translate-y-1/2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Primary Category Horizontal Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              const count =
                cat.id === 'All'
                  ? PRODUCTS.filter((p) => p.popular).length
                  : PRODUCTS.filter((p) => p.category === cat.id).length;

              return (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedSubcategory('All Hardware');
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all flex items-center gap-1.5 cursor-pointer select-none ${
                    isSelected
                      ? 'bg-[#1f2a1d] text-white shadow-sm scale-[1.02]'
                      : 'bg-neutral-100 text-[#4b5b47] hover:bg-neutral-200 hover:text-[#1f2a1d]'
                  }`}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded-full font-extrabold ${
                      isSelected ? 'bg-[#85AB8B] text-[#1f2a1d]' : 'bg-neutral-200 text-neutral-500'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Secondary Subcategories for Vape Mods & Hardware */}
          {selectedCategory === 'Vape Mods & Kits' && (
            <div className="flex items-center gap-2 pt-2 border-t border-neutral-100 overflow-x-auto pb-1">
              <span className="text-xs font-extrabold uppercase tracking-wider text-neutral-400 shrink-0">
                Hardware Category:
              </span>
              {MOD_SUBCATEGORIES.map((sub) => {
                const isSelected = selectedSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubcategory(sub.id)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#85AB8B] text-[#1f2a1d] font-bold shadow-2xs'
                        : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Category Result Counter */}
        <div className="flex items-center justify-between mb-6 text-xs text-neutral-500 px-1">
          <div>
            Showing <strong className="text-[#1f2a1d]">{filteredProducts.length}</strong> products in{' '}
            <span className="text-[#336443] font-bold">
              {selectedCategory === 'All' ? 'All Best Sellers' : selectedCategory}
              {selectedCategory === 'Vape Mods & Kits' && selectedSubcategory !== 'All Hardware' && ` › ${selectedSubcategory}`}
            </span>
          </div>
          <div className="text-[11px] text-[#4b5b47]">
            Volume tiered pricing · Same-day pickup
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredProducts.map((prod) => (
            <CatalogCard key={prod.id} prod={prod} onAdded={handleItemAdded} />
          ))}
        </div>

        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white/50 rounded-3xl border border-white text-neutral-400 space-y-3">
            <Package className="w-10 h-10 mx-auto text-neutral-300" />
            <div className="text-sm font-semibold">No products found matching your search.</div>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}
              className="px-4 py-2 bg-[#1f2a1d] text-white text-xs font-bold rounded-full hover:bg-[#336443] transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
