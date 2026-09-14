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
  fetchInventoryItem,
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

    // Handle deep-link URLs (/products/:slug, /categories/:cat) and browser history popstate
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/products/')) {
        const idOrSku = decodeURIComponent(path.replace('/products/', '').trim());
        if (idOrSku) {
          fetchInventoryItem(idOrSku)
            .then((item) => {
              if (item) setDetailItem(item);
            })
            .catch(() => {
              // Product not found or network issue
            });
        }
      } else if (path.startsWith('/categories/')) {
        const catSlug = decodeURIComponent(path.replace('/categories/', '').trim()).toLowerCase();
        fetchInventoryMeta().then((meta) => {
          const match = meta.categories.find(
            (c) => c.toLowerCase().replace(/[^a-z0-9]+/g, '-') === catSlug
          );
          if (match) setSelectedCategory(match);
        });
      }
    };

    handleRoute();

    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        fetchInventoryItem(customEvent.detail)
          .then((item) => {
            if (item) setDetailItem(item);
          })
          .catch(() => {});
      }
    };

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('open-product-modal', handleCustomOpen);

    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('open-product-modal', handleCustomOpen);
    };
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
    <section id="inventory" className="py-16 sm:py-24 bg-[#F8FAFC] text-[#0f172A] relative overflow-hidden">
      {/* Decorative subtle background gradient glows */}
      <div className="absolute top-10 left-[-5%] w-[450px] h-[450px] rounded-full bg-[#F97316]/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] rounded-full bg-slate-300/30 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#F97316]/10 text-[#F97316] border border-[#F97316]/20 text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Real-Time Inventory
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <Package className="w-3.5 h-3.5 text-[#F97316]" />
                OKC Central Warehouse · Updated {lastUpdatedTime}
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-[#0f172A]">
              Inventory
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
              Browse our current available inventory. Real-time stock levels, wholesale tiered pricing, and direct dispensary case distribution from our central Oklahoma City warehouse.
            </p>
          </div>

          {/* Dispatch Phone Link & Cart */}
          <div className="flex items-center gap-3 self-start md:self-end flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
              className="inline-flex items-center gap-2 bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-white" />
              <span>Wholesale Cart</span>
            </button>
            <a
              href="tel:4057682975"
              className="inline-flex items-center gap-2 bg-[#0f172A] hover:bg-[#1e293b] text-white text-xs font-bold px-5 py-2.5 rounded-full shadow transition-colors border border-slate-800"
            >
              <Phone className="w-3.5 h-3.5 text-[#F97316]" />
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
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, or category..."
                className="w-full bg-white pl-11 pr-10 py-3.5 rounded-full border border-slate-200 text-sm sm:text-base text-[#0f172A] placeholder-slate-400 focus:outline-none focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 shadow-sm transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
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
              className="h-12 px-4 rounded-full bg-white hover:bg-slate-50 border border-slate-200 text-[#0f172A] text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 text-[#F97316] ${isRefreshing || loading ? 'animate-spin' : ''}`} />
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
                      ? 'bg-[#0f172A] text-white shadow-sm border border-[#F97316]/40'
                      : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Advanced Filter Toolbar (Brand, Availability, Price Range, Product Type, Sorting) */}
          <div className="bg-white/80 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Brand Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold">Brand:</span>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Brand"
                  className="bg-transparent font-bold text-[#0f172A] border-0 outline-none cursor-pointer"
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
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold">Availability:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => {
                    setSelectedAvailability(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Availability"
                  className="bg-transparent font-bold text-[#0f172A] border-0 outline-none cursor-pointer"
                >
                  <option value="all">All Availability</option>
                  <option value="in_stock">🟢 In Stock</option>
                  <option value="low_stock">🟡 Low Stock</option>
                  <option value="out_of_stock">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-400 font-semibold">Price:</span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => {
                    setSelectedPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Price Range"
                  className="bg-transparent font-bold text-[#0f172A] border-0 outline-none cursor-pointer"
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
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-400 font-semibold">Type:</span>
                  <select
                    value={selectedProductType}
                    onChange={(e) => {
                      setSelectedProductType(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by Product Type"
                    className="bg-transparent font-bold text-[#0f172A] border-0 outline-none cursor-pointer"
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
              <span className="text-slate-400 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort Inventory"
                className="bg-slate-50 font-bold text-[#0f172A] border border-slate-200 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
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
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-[#0f172A]">{items.length}</strong> of{' '}
            <strong className="text-[#0f172A]">{totalItems}</strong> verified products
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
                    ? 'bg-[#0f172A] text-white'
                    : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
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
                className="bg-white/60 rounded-[28px] p-4 border border-slate-200 animate-pulse space-y-4"
              >
                <div className="aspect-[4/3] bg-slate-200 rounded-2xl" />
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-6 bg-slate-200 rounded w-3/4" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
                <div className="h-10 bg-slate-200 rounded-full" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="mt-12 bg-white rounded-[32px] p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Boxes className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#0f172A]">No Products Found</h3>
            <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
              We couldn't find any inventory matching your current search or filter combination.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-6 py-2.5 rounded-full transition-colors cursor-pointer"
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
              className="p-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-[#0f172A]" />
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
                    {showEllipsis && <span className="px-2 text-slate-400">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-full text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                        currentPage === p
                          ? 'bg-[#0f172A] text-white shadow-sm border border-[#F97316]/40'
                          : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
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
              className="p-2.5 rounded-full bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer shadow-2xs"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-[#0f172A]" />
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal */}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          displayMode={settings.display_mode}
          onClose={() => {
            setDetailItem(null);
            if (window.location.pathname.startsWith('/products/')) {
              window.history.pushState({}, '', '/');
            }
          }}
          onAddedToCart={handleAddedToCart}
        />
      )}

      {/* Cart Toast Notification */}
      {cartToast && (
        <div className="fixed top-24 right-4 sm:right-6 z-50 bg-[#0f172A] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#F97316]/30 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-[#F97316]/20 flex items-center justify-center text-[#F97316] shrink-0 border border-[#F97316]/30">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-white">{cartToast}</p>
            <button
              onClick={() => {
                setCartToast(null);
                window.dispatchEvent(new CustomEvent('open-cart'));
              }}
              className="text-[11px] text-[#F97316] hover:text-orange-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"
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
