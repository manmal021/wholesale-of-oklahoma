import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  ShoppingBag,
  ArrowUpDown,
  Boxes,
  Phone,
  Package,
} from 'lucide-react';
import type {
  InventoryItem,
  AdminInventorySettings,
  ZohoSyncStatus,
} from '../../types/inventory';
import {
  fetchInventory,
  fetchInventoryMeta,
  fetchAdminStatus,
} from '../../lib/inventoryApi';
import { InventoryCard } from './InventoryCard';
import { ProductDetailModal } from './ProductDetailModal';

const CATEGORY_TABS = [
  { id: 'All', label: 'All Inventory', icon: '📦' },
  { id: 'Disposable Vapes', label: 'Disposables', icon: '💨' },
  { id: 'Vape Mods & Kits', label: 'Mods & Kits', icon: '⚙️' },
  { id: 'Vape Juice', label: 'Vape Juices', icon: '💧' },
  { id: 'Pipes & Glass', label: 'Pipes & Glass', icon: '🧪' },
  { id: 'THCA, CBD & Delta', label: 'THCA & Hemp', icon: '🌿' },
  { id: 'Kratom', label: 'Kratom', icon: '🍃' },
  { id: 'Accessories', label: 'Accessories', icon: '👑' },
  { id: 'Novelties', label: 'Novelties', icon: '⚖️' },
];

export const InventorySection: React.FC = () => {
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>('All');
  const [selectedAvailability, setSelectedAvailability] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [selectedPriceRange, setSelectedPriceRange] = useState<string>('all');
  const [selectedProductType, setSelectedProductType] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'availability'>('newest');

  // Metadata for filter dropdowns
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [productTypesList, setProductTypesList] = useState<string[]>([]);

  // Admin & Sync Settings (internal, not customer-facing)
  const [settings, setSettings] = useState<AdminInventorySettings>({
    display_mode: 'exact_quantity',
    hide_out_of_stock: false,
    low_stock_threshold: 15,
    allow_backorders: false,
  });
  const [syncStatus, setSyncStatus] = useState<ZohoSyncStatus>({
    connection_status: 'demo_mode',
    last_sync_time: null,
    last_update_time: null,
    total_items_synced: 0,
    items_with_errors: 0,
  });

  // Modal states
  const [detailItem, setDetailItem] = useState<InventoryItem | null>(null);
  const [cartToast, setCartToast] = useState<string | null>(null);

  // Debounce search query input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load metadata and admin status on mount
  useEffect(() => {
    fetchInventoryMeta()
      .then((meta) => {
        setBrandsList(meta.brands || []);
        setProductTypesList(meta.productTypes || []);
      })
      .catch((err) => console.error('Error fetching meta:', err));

    fetchAdminStatus()
      .then((data) => {
        setSettings(data.settings);
        setSyncStatus(data.sync_status);
      })
      .catch((err) => console.error('Error fetching admin status:', err));
  }, []);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('Just now');

  // Fetch inventory whenever filters or pagination change
  const loadInventory = useCallback(async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    else setIsRefreshing(true);
    try {
      const res = await fetchInventory({
        search: debouncedSearch,
        category: selectedCategory,
        brand: selectedBrand,
        availability: selectedAvailability,
        price_range: selectedPriceRange,
        product_type: selectedProductType,
        sort_by: sortBy,
        page: currentPage,
        limit: pageSize,
      });

      setItems(res.items || []);
      setTotalItems(res.total || 0);
      setTotalPages(res.total_pages || 1);
      setSettings(res.settings);
      setLastUpdatedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    } catch (err) {
      console.error('Failed to load inventory items:', err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [
    debouncedSearch,
    selectedCategory,
    selectedBrand,
    selectedAvailability,
    selectedPriceRange,
    selectedProductType,
    sortBy,
    currentPage,
    pageSize,
  ]);

  // Initial and reactive load
  useEffect(() => {
    loadInventory(false);
  }, [loadInventory]);

  // Real-time polling every 25 seconds for live Zoho inventory updates
  useEffect(() => {
    const interval = setInterval(() => {
      loadInventory(true);
    }, 25000);
    return () => clearInterval(interval);
  }, [loadInventory]);

  const handleAddedToCart = (name: string, qty: number) => {
    setCartToast(`Added ${qty}x ${name} to Wholesale Cart!`);
    setTimeout(() => setCartToast(null), 3000);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedAvailability('all');
    setSelectedPriceRange('all');
    setSelectedProductType('All');
    setSortBy('newest');
    setCurrentPage(1);
  };

  const hasActiveFilters =
    debouncedSearch !== '' ||
    selectedCategory !== 'All' ||
    selectedBrand !== 'All' ||
    selectedAvailability !== 'all' ||
    selectedPriceRange !== 'all' ||
    selectedProductType !== 'All';

  return (
    <section id="inventory" className="py-16 sm:py-24 bg-[#f5f5f4] text-[#1f2a1d] relative overflow-hidden">
      {/* Decorative subtle background gradient glows */}
      <div className="absolute top-10 left-[-5%] w-[450px] h-[450px] rounded-full bg-[#85AB8B]/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] rounded-full bg-[#336443]/10 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-neutral-200/80">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#336443]/10 text-[#336443] text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Real-Time Inventory
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 bg-white px-3 py-1 rounded-full border border-neutral-200/80 shadow-2xs">
                <Package className="w-3.5 h-3.5 text-[#85AB8B]" />
                OKC Central Warehouse · Updated {lastUpdatedTime}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#1f2a1d]">
              Inventory
            </h2>
            <p className="text-neutral-600 text-sm sm:text-base max-w-2xl leading-relaxed">
              Browse our current available inventory. Real-time stock levels, wholesale tiered pricing, and direct dispensary case distribution from our central Oklahoma City warehouse.
            </p>
          </div>

          {/* Dispatch Phone Link & Cart */}
          <div className="flex items-center gap-3 self-start md:self-end flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
              className="inline-flex items-center gap-2 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] text-xs font-bold px-5 py-2.5 rounded-full shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-[#1f2a1d]" />
              <span>Wholesale Cart</span>
            </button>
            <a
              href="tel:4057682975"
              className="inline-flex items-center gap-2 bg-[#1f2a1d] hover:bg-[#336443] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow transition-colors"
            >
              <Phone className="w-3.5 h-3.5 text-[#85AB8B]" />
              <span className="hidden sm:inline">OKC Live Restock:</span> (405) 768-2975
            </a>
          </div>
        </div>

        {/* Search & Category Pills Bar */}
        <div className="mt-8 space-y-5">
          {/* Prominent Search Bar with Quick Refresh */}
          <div className="flex items-center gap-3 max-w-3xl">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-neutral-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, or category..."
                className="w-full bg-white pl-11 pr-10 py-3.5 rounded-full border border-neutral-200 text-sm sm:text-base placeholder-neutral-400 focus:outline-none focus:border-[#336443] focus:ring-2 focus:ring-[#85AB8B]/20 shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-neutral-400 hover:text-neutral-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Live Refresh Button */}
            <button
              type="button"
              onClick={() => loadInventory(false)}
              disabled={isRefreshing || loading}
              title="Refresh live warehouse inventory"
              className="h-12 px-4 rounded-full bg-white hover:bg-neutral-50 border border-neutral-200 text-[#1f2a1d] text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 text-[#85AB8B] ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Live Refresh</span>
            </button>
          </div>

          {/* Category Pills Navigation */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORY_TABS.map((tab) => {
              const active = selectedCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(tab.id);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 shadow-2xs ${
                    active
                      ? 'bg-[#1f2a1d] text-white shadow-sm'
                      : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Advanced Filter Toolbar (Brand, Availability, Price Range, Product Type, Sorting) */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Brand Filter */}
              <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                <span className="text-neutral-400 font-semibold">Brand:</span>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Brand"
                  className="bg-transparent font-bold text-[#1f2a1d] border-0 outline-none cursor-pointer"
                >
                  <option value="All">All Brands</option>
                  {brandsList.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                <span className="text-neutral-400 font-semibold">Availability:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => {
                    setSelectedAvailability(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Availability"
                  className="bg-transparent font-bold text-[#1f2a1d] border-0 outline-none cursor-pointer"
                >
                  <option value="all">All Availability</option>
                  <option value="in_stock">🟢 In Stock</option>
                  <option value="low_stock">🟡 Low Stock</option>
                  <option value="out_of_stock">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                <span className="text-neutral-400 font-semibold">Price:</span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => {
                    setSelectedPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Price Range"
                  className="bg-transparent font-bold text-[#1f2a1d] border-0 outline-none cursor-pointer"
                >
                  <option value="all">All Prices</option>
                  <option value="under-15">Under $15</option>
                  <option value="15-30">$15 - $30</option>
                  <option value="30-60">$30 - $60</option>
                  <option value="60-plus">$60+</option>
                </select>
              </div>

              {/* Product Type */}
              {productTypesList.length > 0 && (
                <div className="flex items-center gap-1.5 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
                  <span className="text-neutral-400 font-semibold">Type:</span>
                  <select
                    value={selectedProductType}
                    onChange={(e) => {
                      setSelectedProductType(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by Product Type"
                    className="bg-transparent font-bold text-[#1f2a1d] border-0 outline-none cursor-pointer"
                  >
                    <option value="All">All Types</option>
                    {productTypesList.map((pt) => (
                      <option key={pt} value={pt}>
                        {pt}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Clear active filters button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-rose-200"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-neutral-400 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort Inventory"
                className="bg-neutral-50 font-bold text-[#1f2a1d] border border-neutral-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="newest">Newest Restocks</option>
                <option value="name_asc">Product Name (A - Z)</option>
                <option value="name_desc">Product Name (Z - A)</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="availability">Availability (In Stock First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Total Results Count & Page Summary */}
        <div className="mt-6 flex items-center justify-between text-xs text-neutral-500 px-1">
          <span>
            Showing <strong className="text-[#1f2a1d]">{items.length}</strong> of{' '}
            <strong className="text-[#1f2a1d]">{totalItems}</strong> verified products
          </span>

          <div className="flex items-center gap-2">
            <span>Per page:</span>
            {[12, 24, 48].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-2 py-0.5 rounded font-bold transition-colors cursor-pointer ${
                  pageSize === size
                    ? 'bg-[#1f2a1d] text-white'
                    : 'bg-neutral-200 hover:bg-neutral-300 text-neutral-700'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid: 4 cols desktop (xl), 3 cols (lg), 2 cols (md), 1-2 cols (mobile) */}
        {loading ? (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="bg-white/60 rounded-[28px] p-4 border border-neutral-200 animate-pulse space-y-4"
              >
                <div className="aspect-[4/3] bg-neutral-200 rounded-2xl" />
                <div className="h-4 bg-neutral-200 rounded w-1/3" />
                <div className="h-6 bg-neutral-200 rounded w-3/4" />
                <div className="h-4 bg-neutral-200 rounded w-1/2" />
                <div className="h-10 bg-neutral-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="mt-12 bg-white rounded-[32px] p-12 text-center border border-neutral-200/80 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto text-neutral-400">
              <Boxes className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#1f2a1d]">No Products Found</h3>
            <p className="text-neutral-500 text-xs sm:text-sm leading-relaxed">
              We couldn't find any inventory matching your current search or filter combination.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-[#1f2a1d] hover:bg-[#336443] text-white text-xs font-bold px-6 py-2.5 rounded-full transition-colors cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <InventoryCard
                key={item.sku}
                item={item}
                displayMode={settings.display_mode}
                onViewDetails={(prod) => setDetailItem(prod)}
                onAddedToCart={handleAddedToCart}
              />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-[#1f2a1d]" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  Math.abs(p - currentPage) <= 2
              )
              .map((p, idx, arr) => {
                const prev = arr[idx - 1];
                const showEllipsis = prev && p - prev > 1;
                return (
                  <React.Fragment key={p}>
                    {showEllipsis && <span className="px-2 text-neutral-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                        currentPage === p
                          ? 'bg-[#1f2a1d] text-white shadow-sm'
                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-200/80'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                );
              })}

            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2.5 rounded-full bg-white border border-neutral-200 hover:bg-neutral-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-[#1f2a1d]" />
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          displayMode={settings.display_mode}
          onClose={() => setDetailItem(null)}
          onAddedToCart={handleAddedToCart}
        />
      )}


      {/* Cart Toast Notification */}
      {cartToast && (
        <div className="fixed top-24 right-4 sm:right-6 z-50 bg-[#1f2a1d] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#85AB8B]/30 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-[#336443] flex items-center justify-center text-[#85AB8B] shrink-0">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{cartToast}</p>
            <button
              onClick={() => {
                setCartToast(null);
                window.dispatchEvent(new CustomEvent('open-cart'));
              }}
              className="text-[11px] text-[#85AB8B] hover:text-white hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"
            >
              <span>View Wholesale Cart →</span>
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default InventorySection;
