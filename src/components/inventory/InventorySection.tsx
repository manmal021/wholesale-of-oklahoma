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

interface InventorySectionProps {
  initialBrand?: string;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ initialBrand }) => {
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(100);
  const [loading, setLoading] = useState<boolean>(true);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand || 'All');
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
      } else if (path.startsWith('/brands/')) {
        const brandSlug = decodeURIComponent(path.replace('/brands/', '').trim()).toLowerCase();
        fetchInventoryMeta().then((meta) => {
          const match = meta.brands.find(
            (b) => b.toLowerCase().replace(/[^a-z0-9]+/g, '-') === brandSlug
          );
          if (match) setSelectedBrand(match);
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

    const handleBrandSelect = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      if (customEvent.detail) {
        setSelectedBrand(customEvent.detail);
        setCurrentPage(1);
      }
    };

    window.addEventListener('popstate', handleRoute);
    window.addEventListener('open-product-modal', handleCustomOpen);
    window.addEventListener('woo-select-category', handleCategorySelect);
    window.addEventListener('woo-select-brand', handleBrandSelect);

    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('open-product-modal', handleCustomOpen);
      window.removeEventListener('woo-select-category', handleCategorySelect);
      window.removeEventListener('woo-select-brand', handleBrandSelect);
    };
  }, []);

  useEffect(() => {
    if (initialBrand) {
      setSelectedBrand(initialBrand);
      setCurrentPage(1);
    }
  }, [initialBrand]);

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

  // Group items by brand for structured brand display
  const brandGroups = React.useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const item of items) {
      const b = item.brand || 'Other Brands';
      if (!map.has(b)) map.set(b, []);
      map.get(b)!.push(item);
    }
    // Priority order for notable wholesale brands
    const priority = [
      'Geekbar',
      'Raz',
      'Vozol',
      'Foger',
      'Vaporesso',
      'SMOK',
      'Yocan',
      'Juice Head',
      'Coastal Clouds',
      'Sadboy',
      'Twist',
      'OPMS',
      'RAW',
      'Cookies',
      'King Palm',
      'Eyce',
    ];
    const sortedBrands = Array.from(map.keys()).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
    return sortedBrands.map((brand) => ({
      brand,
      items: map.get(brand)!,
    }));
  }, [items]);

  return (
    <section id="inventory" className="py-16 sm:py-24 bg-[#F8FAFC] text-slate-900 relative overflow-hidden border-t border-slate-200">
      {/* Decorative subtle background gradient glows */}
      <div className="absolute top-10 left-[-5%] w-[450px] h-[450px] rounded-full bg-[#FF6B00]/5 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-[-5%] w-[500px] h-[500px] rounded-full bg-slate-300/20 blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Breadcrumbs Navigation Hierarchy: Home > Inventory > Brands > [Brand] */}
        <nav aria-label="Inventory Breadcrumbs" className="mb-6 flex items-center gap-2 text-xs text-slate-500 flex-wrap">
          <a
            href="#overview"
            className="hover:text-[#FF6B00] transition-colors flex items-center gap-1 font-medium"
          >
            <span>Home</span>
          </a>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('All');
              setSelectedCategory('All');
              setCurrentPage(1);
            }}
            className={`hover:text-[#FF6B00] transition-colors cursor-pointer font-medium ${
              selectedBrand === 'All' && selectedCategory === 'All' ? 'text-slate-900 font-bold' : ''
            }`}
          >
            Inventory
          </button>
          <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          <button
            type="button"
            onClick={() => {
              setSelectedBrand('All');
              setCurrentPage(1);
            }}
            className={`hover:text-[#FF6B00] transition-colors cursor-pointer font-medium ${
              selectedBrand === 'All' ? 'text-[#FF6B00] font-bold' : ''
            }`}
          >
            Brands
          </button>
          {selectedBrand !== 'All' && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#FF6B00] px-2.5 py-0.5 rounded-md font-bold text-xs border border-orange-200">
                {selectedBrand}
              </span>
            </>
          )}
        </nav>
        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-slate-200">
          <div className="space-y-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Wholesale Catalog
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-xs">
                <Package className="w-3.5 h-3.5 text-[#FF6B00]" />
                OKC Central Warehouse · Updated {lastUpdatedTime}
              </span>
            </div>

            <h2 className="heading-1 font-black tracking-tight text-slate-900">
              Wholesale Inventory
            </h2>
            <p className="text-slate-600 text-sm sm:text-base max-w-2xl leading-relaxed">
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
                <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products, SKU, or brand..."
                className="w-full bg-white pl-11 pr-10 py-3.5 rounded-xl border border-slate-300 text-sm sm:text-base text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#FF6B00] focus:ring-2 focus:ring-[#FF6B00]/20 shadow-xs transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
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
              className="h-12 px-4 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50 shrink-0 shadow-xs"
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
                  : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
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
                      : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{cat}</span>
                </button>
              );
            })}
          </div>

          {/* Shop by Brand Pills Toolbar */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500">
              <span className="uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                Shop by Brand Directory
              </span>
              {selectedBrand !== 'All' && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBrand('All');
                    setCurrentPage(1);
                  }}
                  className="text-[#FF6B00] hover:underline cursor-pointer flex items-center gap-1 font-semibold"
                >
                  <span>View All Brands</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('All');
                  setCurrentPage(1);
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  selectedBrand === 'All'
                    ? 'bg-[#FF6B00] text-white shadow-md'
                    : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
                }`}
              >
                <span>🏷️</span>
                <span>All Brands</span>
              </button>
              {brandsList.map((brand) => {
                const active = selectedBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => {
                      setSelectedBrand(brand);
                      setCurrentPage(1);
                    }}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                      active
                        ? 'bg-[#FF6B00] text-white shadow-md'
                        : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 shadow-xs'
                    }`}
                  >
                    <span>{brand}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Advanced Filter Toolbar (Brand, Availability, Price Range, Product Type, Sorting) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Brand Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold">Brand:</span>
                <select
                  value={selectedBrand}
                  onChange={(e) => {
                    setSelectedBrand(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Brand"
                  className="bg-transparent font-bold text-slate-900 border-0 outline-none cursor-pointer"
                >
                  <option value="All" className="bg-white text-slate-900">All Brands</option>
                  {brandsList.map((b) => (
                    <option key={b} value={b} className="bg-white text-slate-900">
                      {b}
                    </option>
                  ))}
                </select>
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold">Availability:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => {
                    setSelectedAvailability(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Availability"
                  className="bg-transparent font-bold text-slate-900 border-0 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-900">All Availability</option>
                  <option value="in_stock" className="bg-white text-slate-900">🟢 In Stock</option>
                  <option value="low_stock" className="bg-white text-slate-900">🟡 Low Stock</option>
                  <option value="out_of_stock" className="bg-white text-slate-900">🔴 Out of Stock</option>
                </select>
              </div>

              {/* Price Range */}
              <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-semibold">Price:</span>
                <select
                  value={selectedPriceRange}
                  onChange={(e) => {
                    setSelectedPriceRange(e.target.value);
                    setCurrentPage(1);
                  }}
                  aria-label="Filter by Price Range"
                  className="bg-transparent font-bold text-slate-900 border-0 outline-none cursor-pointer"
                >
                  <option value="all" className="bg-white text-slate-900">All Prices</option>
                  <option value="under-15" className="bg-white text-slate-900">Under $15</option>
                  <option value="15-30" className="bg-white text-slate-900">$15 - $30</option>
                  <option value="30-60" className="bg-white text-slate-900">$30 - $60</option>
                  <option value="60-plus" className="bg-white text-slate-900">$60+</option>
                </select>
              </div>

              {/* Product Type */}
              {productTypesList.length > 0 && (
                <div className="flex items-center gap-1.5 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
                  <span className="text-slate-500 font-semibold">Type:</span>
                  <select
                    value={selectedProductType}
                    onChange={(e) => {
                      setSelectedProductType(e.target.value);
                      setCurrentPage(1);
                    }}
                    aria-label="Filter by Product Type"
                    className="bg-transparent font-bold text-slate-900 border-0 outline-none cursor-pointer"
                  >
                    <option value="All" className="bg-white text-slate-900">All Types</option>
                    {productTypesList.map((pt) => (
                      <option key={pt} value={pt} className="bg-white text-slate-900">
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
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#FF6B00]" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                aria-label="Sort Inventory"
                className="bg-slate-50 font-bold text-slate-900 border border-slate-300 rounded-xl px-3 py-1.5 outline-none cursor-pointer"
              >
                <option value="newest" className="bg-white text-slate-900">Newest Restocks</option>
                <option value="name_asc" className="bg-white text-slate-900">Product Name (A - Z)</option>
                <option value="name_desc" className="bg-white text-slate-900">Product Name (Z - A)</option>
                <option value="price_asc" className="bg-white text-slate-900">Price: Low to High</option>
                <option value="price_desc" className="bg-white text-slate-900">Price: High to Low</option>
                <option value="availability" className="bg-white text-slate-900">Availability (In Stock First)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Total Results Count & Page Summary */}
        <div className="mt-6 flex items-center justify-between text-xs text-slate-500 px-1">
          <span>
            Showing <strong className="text-slate-900">{items.length}</strong> of{' '}
            <strong className="text-slate-900">{totalItems}</strong> verified products
          </span>

          <div className="flex items-center gap-2">
            <span>Per page:</span>
            {[24, 48, 100].map((size) => (
              <button
                key={size}
                type="button"
                onClick={() => {
                  setPageSize(size);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-0.5 rounded-lg font-bold transition-colors cursor-pointer ${
                  pageSize === size
                    ? 'bg-[#FF6B00] text-white shadow-xs'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-xs'
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
                className="bg-white rounded-2xl p-4 border border-slate-200 animate-pulse space-y-4 shadow-xs"
              >
                <div className="aspect-[4/3] bg-slate-100 rounded-xl" />
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-6 bg-slate-100 rounded w-3/4" />
                <div className="h-4 bg-slate-100 rounded w-1/2" />
                <div className="h-10 bg-slate-100 rounded-xl" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          /* Empty State */
          <div className="mt-12 bg-white rounded-2xl p-12 text-center border border-slate-200 max-w-lg mx-auto space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
              <Boxes className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900">No Products Found</h3>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              We couldn't find any inventory matching your current search or filter combination.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="btn-primary text-xs py-2 px-6 rounded-full cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : selectedBrand === 'All' ? (
          /* All Brands View: Arranged inside each brand (Home > Inventory > Brands > Product) */
          <div className="mt-8 space-y-12">
            {brandGroups.map((group) => (
              <div
                key={group.brand}
                id={`brand-group-${group.brand.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}
                className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm space-y-6"
              >
                {/* Brand Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200">
                        Brand Directory
                      </span>
                      <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full border border-slate-200">
                        {group.items.length} {group.items.length === 1 ? 'Product' : 'Products'} in stock
                      </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                      {group.brand}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Home <span className="text-slate-300 font-bold">/</span> Inventory <span className="text-slate-300 font-bold">/</span> Brands <span className="text-slate-300 font-bold">/</span> <strong className="text-slate-900">{group.brand} Products</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand(group.brand);
                      setCurrentPage(1);
                      const el = document.getElementById('inventory');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="self-start sm:self-center text-xs font-bold text-[#FF6B00] hover:text-[#E85F00] bg-orange-50/60 hover:bg-orange-100/70 border border-orange-200 px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                  >
                    <span>View Only {group.brand} ({group.items.length})</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Product Grid for Brand */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {group.items.map((item) => (
                    <InventoryCard
                      key={item.sku}
                      item={item}
                      displayMode={settings.display_mode}
                      onViewDetails={(prod) => setDetailItem(prod)}
                      onAddedToCart={handleAddedToCart}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Specific Brand View: Home > Inventory > Brands > [Selected Brand] */
          <div className="mt-8 space-y-6">
            {/* Active Brand Showcase Banner */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 border border-orange-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1 font-medium">
                  <span>Home</span>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand('All');
                      setSelectedCategory('All');
                      setCurrentPage(1);
                    }}
                    className="hover:text-[#FF6B00]"
                  >
                    Inventory
                  </button>
                  <span>/</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand('All');
                      setCurrentPage(1);
                    }}
                    className="hover:text-[#FF6B00] underline"
                  >
                    Brands
                  </button>
                  <span>/</span>
                  <span className="text-[#FF6B00] font-bold">{selectedBrand}</span>
                </div>
                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                  {selectedBrand} Products
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Showing {items.length} verified {selectedBrand} {items.length === 1 ? 'product' : 'products'} from our Oklahoma City wholesale warehouse.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedBrand('All');
                  setCurrentPage(1);
                }}
                className="self-start sm:self-center text-xs font-bold text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-300 hover:border-[#FF6B00] px-4 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-2 shrink-0 shadow-xs"
              >
                <ChevronLeft className="w-4 h-4 text-[#FF6B00]" />
                <span>← Back to All Brands</span>
              </button>
            </div>

            {/* Grid of items for this Brand */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#FF6B00] disabled:opacity-30 transition-colors cursor-pointer shadow-xs"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4 text-slate-700" />
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
                      className={`w-9 h-9 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
                          ? 'bg-[#FF6B00] text-white shadow-md'
                          : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 shadow-xs'
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
              className="p-2.5 rounded-xl bg-white border border-slate-300 hover:border-[#FF6B00] disabled:opacity-30 transition-colors cursor-pointer shadow-xs"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4 text-slate-700" />
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
        <div className="fixed top-24 right-4 sm:right-6 z-50 bg-white text-slate-900 px-4 py-3 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-3 animate-in slide-in-from-top-4 duration-300">
          <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#FF6B00] shrink-0 border border-orange-200">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-900">{cartToast}</p>
            <button
              onClick={() => {
                setCartToast(null);
                window.dispatchEvent(new CustomEvent('open-cart'));
              }}
              className="text-[11px] text-[#FF6B00] hover:text-[#E85F00] hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"
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
