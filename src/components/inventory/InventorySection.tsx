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
  const [categoriesList, setCategoriesList] = useState<string[]>([]);

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
        setCategoriesList(meta.categories || []);
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

    const handleCategorySelect = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedCategory(customEvent.detail);
        setCurrentPage(1);
      }
    };

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('open-product-modal', handleCustomOpen);
    window.addEventListener('woo-select-category', handleCategorySelect);

    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('open-product-modal', handleCustomOpen);
      window.removeEventListener('woo-select-category', handleCategorySelect);
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
    <section id="inventory" className="py-16 sm:py-24 bg-[#0B0D10] text-[#F7F7F5] relative overflow-hidden">
      {/* Decorative subtle background gradient glows */}
      <div className="absolute top-10 left-[-5%] w-[450px] h-[450px] rounded-full bg-[#FF6B00]/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] rounded-full bg-slate-800/10 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-[#2A3038]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Wholesale Catalog
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B8BDC5] bg-[#15191F] px-3 py-1 rounded-full border border-[#2A3038]">
                <Package className="w-3.5 h-3.5 text-[#FF6B00]" />
                OKC Central Warehouse · Updated {lastUpdatedTime}
              </span>
            </div>

            <h2 className="heading-1 font-black tracking-tight text-[#F7F7F5]">
              Wholesale Inventory
            </h2>
            <p className="text-[#B8BDC5] text-sm sm:text-base max-w-2xl leading-relaxed">
              Browse current available inventory. Real-time stock levels, wholesale tiered pricing, and direct dispensary case distribution from our central Oklahoma City warehouse.
            </p>
          </div>

          {/* Dispatch Phone Link & Cart */}
          <div className="flex items-center gap-3 self-start md:self-end flex-wrap">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
              className="btn-primary text-xs py-2.5 px-5 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5 mr-1.5 text-white" />
              <span>Wholesale Cart</span>
            </button>
            <a
              href="tel:4057682975"
              className="btn-secondary text-xs py-2.5 px-5"
            >
              <Phone className="w-3.5 h-3.5 mr-1.5 text-[#FF6B00]" />
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
                <Search className="h-5 w-5 text-[#858C96]" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, or brand..."
                className="w-full bg-[#15191F] pl-11 pr-10 py-3.5 rounded-xl border border-[#2A3038] text-sm sm:text-base text-[#F7F7F5] placeholder-[#858C96] focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-[#858C96] hover:text-[#F7F7F5] cursor-pointer"
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
              className="h-12 px-4 rounded-xl bg-[#15191F] hover:bg-[#1B2027] border border-[#2A3038] text-[#F7F7F5] text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={`w-4 h-4 text-[#FF6B00] ${isRefreshing || loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Category Pills Navigation (Strictly Active Categories Only) */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('All');
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                selectedCategory === 'All'
                  ? 'bg-[#FF6B00] text-white shadow-md'
                  : 'bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] hover:border-[#353C46]'
              }`}
            >
              <span>📦</span>
              <span>All Products</span>
            </button>
            {categoriesList.map((cat) => {
              const active = selectedCategory === cat;
              const icon =
                cat.toLowerCase().includes('dispos') ? '💨' :
                cat.toLowerCase().includes('pod') ? '⚡' :
                cat.toLowerCase().includes('juice') || cat.toLowerCase().includes('liquid') ? '💧' :
                cat.toLowerCase().includes('tank') || cat.toLowerCase().includes('hard') ? '⚙️' : '📦';

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedCategory(cat);
                    setCurrentPage(1);
                  }}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                    active
                      ? 'bg-[#FF6B00] text-white shadow-md'
                      : 'bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] hover:border-[#353C46]'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Advanced Filter Toolbar (Brand, Availability, Price Range, Product Type, Sorting) */}
          <div className="bg-[#15191F] p-4 rounded-2xl border border-[#2A3038] flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Brand Filter */}
              <div className="flex items-center gap-1.5 bg-[#1B2027] px-3 py-1.5 rounded-xl border border-[#2A3038]">
                <span className="text-[#858C96] font-semibold">Brand:</span>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Brand"
                  className="bg-transparent font-bold text-[#F7F7F5] border-0 outline-none cursor-pointer"
                >
                  <option value="All" className="bg-[#1B2027] text-[#F7F7F5]">All Brands</option>
                  {brandsList.map((b) => (
                    <option key={b} value={b} className="bg-[#1B2027] text-[#F7F7F5]">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-1.5 bg-[#1B2027] px-3 py-1.5 rounded-xl border border-[#2A3038]">
                <span className="text-[#858C96] font-semibold">Availability:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => {
                    setSelectedAvailability(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Availability"
                  className="bg-transparent font-bold text-[#F7F7F5] border-0 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#1B2027] text-[#F7F7F5]">All Availability</option>
                  <option value="in_stock" className="bg-[#1B2027] text-[#F7F7F5]">🟢 In Stock</option>
                  <option value="low_stock" className="bg-[#1B2027] text-[#F7F7F5]">🟡 Low Stock</option>
                  <option value="out_of_stock" className="bg-[#1B2027] text-[#F7F7F5]">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="flex items-center gap-1.5 bg-[#1B2027] px-3 py-1.5 rounded-xl border border-[#2A3038]">
                <span className="text-[#858C96] font-semibold">Price:</span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => {
                    setSelectedPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Price Range"
                  className="bg-transparent font-bold text-[#F7F7F5] border-0 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-[#1B2027] text-[#F7F7F5]">All Prices</option>
                  <option value="under-15" className="bg-[#1B2027] text-[#F7F7F5]">Under $15</option>
                  <option value="15-30" className="bg-[#1B2027] text-[#F7F7F5]">$15 - $30</option>
                  <option value="30-60" className="bg-[#1B2027] text-[#F7F7F5]">$30 - $60</option>
                  <option value="60-plus" className="bg-[#1B2027] text-[#F7F7F5]">$60+</option>
                </select>
              </div>

              {/* Product Type */}
              {productTypesList.length > 0 && (
                <div className="flex items-center gap-1.5 bg-[#1B2027] px-3 py-1.5 rounded-xl border border-[#2A3038]">
                  <span className="text-[#858C96] font-semibold">Type:</span>
                  <select
                    value={selectedProductType}
                    onChange={(e) => {
                      setSelectedProductType(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by Product Type"
                    className="bg-transparent font-bold text-[#F7F7F5] border-0 outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-[#1B2027] text-[#F7F7F5]">All Types</option>
                    {productTypesList.map((pt) => (
                      <option key={pt} value={pt} className="bg-[#1B2027] text-[#F7F7F5]">
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
                  className="px-3 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-rose-800/60"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Filters
                </button>
              )}
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[#858C96] font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#FF6B00]" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort Inventory"
                className="bg-[#1B2027] font-bold text-[#F7F7F5] border border-[#2A3038] rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="newest" className="bg-[#1B2027] text-[#F7F7F5]">Newest Restocks</option>
                <option value="name_asc" className="bg-[#1B2027] text-[#F7F7F5]">Product Name (A - Z)</option>
                <option value="name_desc" className="bg-[#1B2027] text-[#F7F7F5]">Product Name (Z - A)</option>
                <option value="price_asc" className="bg-[#1B2027] text-[#F7F7F5]">Price: Low to High</option>
                <option value="price_desc" className="bg-[#1B2027] text-[#F7F7F5]">Price: High to Low</option>
                <option value="availability" className="bg-[#1B2027] text-[#F7F7F5]">Availability (In Stock First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Total Results Count & Page Summary */}
        <div className="mt-6 flex items-center justify-between text-xs text-[#858C96] px-1">
          <span>
            Showing <strong className="text-[#F7F7F5]">{items.length}</strong> of{' '}
            <strong className="text-[#F7F7F5]">{totalItems}</strong> verified products
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
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  pageSize === size
                    ? 'bg-[#FF6B00] text-white'
                    : 'bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] border border-[#2A3038]'
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
                className="bg-[#15191F] rounded-2xl p-4 border border-[#2A3038] animate-pulse space-y-4"
              >
                <div className="aspect-[4/3] bg-[#1B2027] rounded-xl" />
                <div className="h-4 bg-[#1B2027] rounded w-1/3" />
                <div className="h-6 bg-[#1B2027] rounded w-3/4" />
                <div className="h-4 bg-[#1B2027] rounded w-1/2" />
                <div className="h-10 bg-[#1B2027] rounded-xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="mt-12 bg-[#15191F] rounded-2xl p-12 text-center border border-[#2A3038] max-w-lg mx-auto space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#1B2027] flex items-center justify-center mx-auto text-[#858C96]">
              <Boxes className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-[#F7F7F5]">No Products Found</h3>
            <p className="text-[#858C96] text-xs sm:text-sm leading-relaxed">
              We couldn't find any inventory matching your current search or filter combination.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary text-xs py-2 px-6 rounded-full"
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
              className="p-2.5 rounded-xl bg-[#15191F] border border-[#2A3038] hover:border-[#FF6B00] disabled:opacity-30 transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-[#F7F7F5]" />
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
                    {showEllipsis && <span className="px-2 text-[#858C96]">...</span>}
                    <button
                      type="button"
                      onClick={() => setCurrentPage(p)}
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#FF6B00] text-white shadow-md'
                          : 'bg-[#15191F] hover:bg-[#1B2027] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038]'
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
              className="p-2.5 rounded-xl bg-[#15191F] border border-[#2A3038] hover:border-[#FF6B00] disabled:opacity-30 transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-[#F7F7F5]" />
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
