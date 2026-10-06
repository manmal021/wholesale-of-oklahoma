import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronRight,
  X,
  ShoppingBag,
  SlidersHorizontal,
  Package,
  Layers,
  Wind,
  Coffee,
  Cookie,
  Flame,
  Sparkles,
  Leaf,
  Boxes,
  RefreshCw,
  Phone,
  ShieldCheck,
  CheckCircle2,
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

interface CategorySubItem {
  id: string;
  name: string;
  categoryFilter?: string;
  typeFilter?: string;
  searchKeyword?: string;
}

interface CategoryGroup {
  id: string;
  name: string;
  icon: React.ElementType;
  defaultFilter?: string;
  subcategories: CategorySubItem[];
}

const CATEGORY_TAXONOMY: CategoryGroup[] = [
  {
    id: 'vapes',
    name: 'Vapes',
    icon: Wind,
    defaultFilter: 'Disposable Vapes',
    subcategories: [
      { id: 'all-vapes', name: 'All Vapes', categoryFilter: 'Disposable Vapes' },
      { id: 'disposables', name: 'Disposable Vapes', categoryFilter: 'Disposable Vapes' },
      { id: 'pods', name: 'Pod Systems & Kits', categoryFilter: 'Vape Mods & Kits' },
      { id: 'replacement-pods', name: 'Replacement Pods & Coils', typeFilter: 'Pod' },
      { id: 'e-liquid', name: 'Vape Juice & Salts', categoryFilter: 'Vape Juice' },
      { id: 'vape-accessories', name: 'Accessories & Hardware', categoryFilter: 'Accessories' },
    ],
  },
  {
    id: 'drinks',
    name: 'Drinks',
    icon: Coffee,
    subcategories: [
      { id: 'all-drinks', name: 'All Drinks', searchKeyword: 'Drink' },
      { id: 'energy-drinks', name: 'Energy & Specialty Drinks', searchKeyword: 'Drink' },
      { id: 'hemp-drinks', name: 'THCA / Hemp Beverages', searchKeyword: 'THCA Drink' },
    ],
  },
  {
    id: 'snacks',
    name: 'Snacks',
    icon: Cookie,
    subcategories: [
      { id: 'all-snacks', name: 'All Snacks', searchKeyword: 'Snack' },
      { id: 'counter-candy', name: 'Candy & Counter Displays', searchKeyword: 'Candy' },
      { id: 'packaged-snacks', name: 'Packaged Snacks', searchKeyword: 'Snack' },
    ],
  },
  {
    id: 'tobacco',
    name: 'Tobacco & Smoke',
    icon: Flame,
    subcategories: [
      { id: 'all-tobacco', name: 'All Smoke & Tobacco', categoryFilter: 'Pipes & Glass' },
      { id: 'pipes-glass', name: 'Pipes & Glassware', categoryFilter: 'Pipes & Glass' },
      { id: 'papers-cones', name: 'Rolling Papers & Cones', typeFilter: 'Papers' },
      { id: 'torches-butane', name: 'Torches & Butane', searchKeyword: 'Torch' },
    ],
  },
  {
    id: 'hemp',
    name: 'THCA, Delta & Hemp',
    icon: Sparkles,
    defaultFilter: 'THCA, CBD & Delta',
    subcategories: [
      { id: 'all-hemp', name: 'All Cannabinoids', categoryFilter: 'THCA, CBD & Delta' },
      { id: 'thca-disposables', name: 'THCA & Delta Disposables', typeFilter: 'Devices Kit' },
      { id: 'hemp-flower', name: 'Flower & Pre-rolls', typeFilter: 'Flower' },
      { id: 'edibles-gummies', name: 'Gummies & Edibles', typeFilter: 'Edibles' },
    ],
  },
  {
    id: 'kratom',
    name: 'Kratom & Botanicals',
    icon: Leaf,
    defaultFilter: 'Kratom',
    subcategories: [
      { id: 'all-kratom', name: 'All Kratom', categoryFilter: 'Kratom' },
      { id: 'kratom-extracts', name: 'Liquid Extracts', typeFilter: 'Extracts' },
      { id: 'kratom-capsules', name: 'Capsules & Powders', searchKeyword: 'Capsules' },
    ],
  },
  {
    id: 'general-merch',
    name: 'General Merchandise',
    icon: Boxes,
    subcategories: [
      { id: 'all-general', name: 'All General Merch.', categoryFilter: 'Novelties' },
      { id: 'digital-scales', name: 'Precision Digital Scales', searchKeyword: 'Scale' },
      { id: 'herb-grinders', name: 'Herb Grinders', searchKeyword: 'Grinder' },
      { id: 'batteries-510', name: '510 Batteries & Chargers', typeFilter: 'Battery' },
    ],
  },
];

interface InventorySectionProps {
  initialBrand?: string;
  currentUser?: any;
  onOpenLogin?: () => void;
  onOpenApplication?: () => void;
}

export const InventorySection: React.FC<InventorySectionProps> = ({ 
  initialBrand,
  currentUser,
  onOpenLogin,
  onOpenApplication
}) => {
  // Inventory state
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(48);
  const [loading, setLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedBrand, setSelectedBrand] = useState<string>(initialBrand || 'All');
  const [selectedProductType, setSelectedProductType] = useState<string>('All');
  const [selectedCategoryLabel, setSelectedCategoryLabel] = useState<string>('All Products');
  const [sortBy, setSortBy] = useState<'newest' | 'name_asc' | 'name_desc' | 'price_asc' | 'price_desc' | 'availability'>('newest');

  // Sidebar & Drawer state
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState<boolean>(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    vapes: true,
  });

  // Metadata
  const [brandsList, setBrandsList] = useState<string[]>([]);
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
      })
      .catch((err) => console.error('Error fetching meta:', err));

    fetchAdminStatus()
      .then((data) => {
        setSettings(data.settings);
        setSyncStatus(data.sync_status);
      })
      .catch((err) => console.error('Error fetching admin status:', err));

    // Handle deep-link URLs
    const handleRoute = () => {
      const path = window.location.pathname;
      if (path.startsWith('/products/')) {
        const idOrSku = decodeURIComponent(path.replace('/products/', '').trim());
        if (idOrSku) {
          fetchInventoryItem(idOrSku)
            .then((it) => setDetailItem(it))
            .catch(() => {});
        }
      }
    };
    handleRoute();
    window.addEventListener('popstate', handleRoute);

    // Custom event listeners
    const handleSelectCategory = (e: any) => {
      if (e.detail) {
        setSelectedCategory(e.detail);
        setSelectedCategoryLabel(e.detail);
        setCurrentPage(1);
      }
    };
    window.addEventListener('woo-select-category', handleSelectCategory);

    return () => {
      window.removeEventListener('popstate', handleRoute);
      window.removeEventListener('woo-select-category', handleSelectCategory);
    };
  }, []);

  // Update brand filter if prop changes
  useEffect(() => {
    if (initialBrand) {
      setSelectedBrand(initialBrand);
      setCurrentPage(1);
    }
  }, [initialBrand]);

  // Main fetch function
  const loadInventory = useCallback(
    async (showLoadingSpinner = true) => {
      if (showLoadingSpinner) setLoading(true);
      else setIsRefreshing(true);

      try {
        const response = await fetchInventory({
          search: debouncedSearch,
          category: selectedCategory,
          brand: selectedBrand,
          product_type: selectedProductType,
          sort_by: sortBy,
          page: currentPage,
          limit: pageSize,
        });

        setItems(response.items || []);
        setTotalItems(response.total ?? (response as any).total_items ?? 0);
        setTotalPages(response.total_pages || 1);
      } catch (error) {
        console.error('Error loading inventory:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [debouncedSearch, selectedCategory, selectedBrand, selectedProductType, sortBy, currentPage, pageSize]
  );

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Accordion Toggle
  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Category Selection
  const handleSelectAll = () => {
    setSelectedCategory('All');
    setSelectedProductType('All');
    setSelectedCategoryLabel('All Products');
    setSearchQuery('');
    setCurrentPage(1);
    setIsMobileDrawerOpen(false);
  };

  const handleSelectMainGroup = (group: CategoryGroup) => {
    toggleGroup(group.id);
    if (group.defaultFilter) {
      setSelectedCategory(group.defaultFilter);
      setSelectedCategoryLabel(group.name);
    } else {
      setSelectedCategory('All');
      setSelectedCategoryLabel(group.name);
    }
    setSelectedProductType('All');
    setCurrentPage(1);
  };

  const handleSelectSub = (groupName: string, sub: CategorySubItem) => {
    if (sub.categoryFilter) {
      setSelectedCategory(sub.categoryFilter);
    } else {
      setSelectedCategory('All');
    }

    if (sub.typeFilter) {
      setSelectedProductType(sub.typeFilter);
    } else {
      setSelectedProductType('All');
    }

    if (sub.searchKeyword) {
      setSearchQuery(sub.searchKeyword);
    }

    setSelectedCategoryLabel(`${groupName} › ${sub.name}`);
    setCurrentPage(1);
    setIsMobileDrawerOpen(false);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedBrand('All');
    setSelectedProductType('All');
    setSelectedCategoryLabel('All Products');
    setCurrentPage(1);
  };

  // Render Category Navigation List
  const renderCategoryNav = () => (
    <div className="space-y-1 text-xs">
      {/* All Products */}
      <button
        type="button"
        onClick={handleSelectAll}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all text-left cursor-pointer ${
          selectedCategory === 'All' && selectedProductType === 'All' && !searchQuery
            ? 'bg-[#FF6B00] text-white shadow-xs'
            : 'text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
        }`}
      >
        <span className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5" />
          <span>All Products</span>
        </span>
        <span
          className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
            selectedCategory === 'All' && selectedProductType === 'All' && !searchQuery
              ? 'bg-white/20 text-white'
              : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {totalItems}
        </span>
      </button>

      {/* Main Categories with Accordions */}
      {CATEGORY_TAXONOMY.map((group) => {
        const isOpen = Boolean(expandedGroups[group.id]);
        const IconComponent = group.icon;
        const isGroupActive = selectedCategoryLabel.startsWith(group.name);

        return (
          <div key={group.id} className="pt-1">
            <button
              type="button"
              onClick={() => handleSelectMainGroup(group)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-bold transition-all text-left cursor-pointer group ${
                isGroupActive && selectedCategory === 'All' && selectedProductType === 'All'
                  ? 'bg-orange-50 text-[#FF6B00] dark:bg-orange-950/40'
                  : 'text-slate-800 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
              }`}
            >
              <span className="flex items-center gap-2">
                <IconComponent className={`w-3.5 h-3.5 transition-colors ${isGroupActive ? 'text-[#FF6B00]' : 'text-slate-400 group-hover:text-slate-600'}`} />
                <span>{group.name}</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-[#FF6B00]' : ''
                }`}
              />
            </button>

            {/* Subcategories */}
            <div
              className={`pl-5 pr-1 space-y-0.5 overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-96 opacity-100 py-1' : 'max-h-0 opacity-0 pointer-events-none'
              }`}
            >
              {group.subcategories.map((sub) => {
                const isSubActive =
                  (sub.categoryFilter && selectedCategory === sub.categoryFilter) ||
                  (sub.typeFilter && selectedProductType === sub.typeFilter) ||
                  (sub.searchKeyword && searchQuery === sub.searchKeyword);

                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSelectSub(group.name, sub)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
                      isSubActive
                        ? 'bg-orange-50 text-[#FF6B00] font-black dark:bg-orange-950/30'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <span>{sub.name}</span>
                    {isSubActive && <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <section id="inventory" className="py-10 sm:py-14 bg-[#F8FAFC] dark:bg-[#0B0F19] text-slate-900 dark:text-white relative border-t border-slate-200 dark:border-slate-800">
      <div id="catalog" />
      <div id="categories" />

      <div className="max-w-[1540px] mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* ── Compact Introduction Header (Minimal Height) ────────────────── */}
        <div className="mb-5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 dark:text-white tracking-tight">
              Catalog
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
              Wholesale inventory available for pickup or statewide delivery.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              OKC Warehouse Active
            </span>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('open-cart'))}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-700 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 px-3 py-1 rounded-full hover:border-[#FF6B00] transition-colors cursor-pointer"
            >
              <ShoppingBag className="w-3 h-3 text-[#FF6B00]" />
              <span>Cart</span>
            </button>
          </div>
        </div>

        {/* ── Compact Toolbar Above Products ─────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 mb-6 bg-white dark:bg-slate-900 p-2 sm:p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          
          {/* Toggle Categories Button */}
          <button
            type="button"
            onClick={() => {
              // On mobile, open slide drawer; on desktop toggle sidebar
              if (window.innerWidth < 1024) {
                setIsMobileDrawerOpen(true);
              } else {
                setIsSidebarOpen(!isSidebarOpen);
              }
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shrink-0 border border-slate-200/80 dark:border-slate-700"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#FF6B00]" />
            <span>Browse Categories</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full font-black bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {selectedCategory !== 'All' ? selectedCategory : 'All'}
            </span>
          </button>

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products, brands, or SKUs..."
              className="w-full bg-slate-50 dark:bg-slate-800/80 pl-9 pr-8 py-2 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#FF6B00] focus:ring-1 focus:ring-[#FF6B00] transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#FF6B00] cursor-pointer"
            >
              <option value="newest">Featured / Newest</option>
              <option value="name_asc">Name: A to Z</option>
              <option value="name_desc">Name: Z to A</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="availability">Stock Availability</option>
            </select>
          </div>
        </div>

        {/* Active Filter Indicator Tag */}
        {(selectedCategory !== 'All' || selectedBrand !== 'All' || selectedProductType !== 'All' || searchQuery) && (
          <div className="flex items-center gap-2 mb-4 flex-wrap text-xs">
            <span className="text-slate-400 font-semibold">Active Filter:</span>
            {selectedCategoryLabel !== 'All Products' && (
              <span className="inline-flex items-center gap-1.5 bg-orange-50 text-[#FF6B00] px-2.5 py-1 rounded-lg font-bold border border-orange-200">
                <span>{selectedCategoryLabel}</span>
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={handleSelectAll} />
              </span>
            )}
            {selectedBrand !== 'All' && (
              <span className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg font-bold border border-slate-200">
                <span>Brand: {selectedBrand}</span>
                <X className="w-3 h-3 cursor-pointer hover:opacity-75" onClick={() => setSelectedBrand('All')} />
              </span>
            )}
            <button
              onClick={handleResetFilters}
              className="text-[11px] text-slate-500 hover:text-slate-800 underline cursor-pointer ml-1"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Main Catalog Workspace: Left Sidebar + Dominant Product Grid ─ */}
        <div className="flex items-start gap-6 relative">
          
          {/* ── Desktop Category Sidebar (240–280px wide) ───────────────── */}
          {isSidebarOpen && (
            <aside className="hidden lg:block w-[260px] shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 shadow-xs sticky top-24">
              <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#FF6B00]" />
                  <span>Browse Categories</span>
                </h3>
              </div>
              {renderCategoryNav()}
            </aside>
          )}

          {/* ── Dominant Product Grid Area ──────────────────────────────── */}
          <main className="flex-1 min-w-0">
            {loading ? (
              <div className={`grid grid-cols-2 md:grid-cols-3 ${isSidebarOpen ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-4 sm:gap-5`}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3"
                  >
                    <div className="aspect-square bg-slate-100 dark:bg-slate-800 rounded-xl" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded w-1/3" />
                    <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-3/4" />
                    <div className="h-9 bg-slate-100 dark:bg-slate-800 rounded-xl" />
                  </div>
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 max-w-lg mx-auto space-y-4">
                <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <Boxes className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">No Products Found</h3>
                <p className="text-slate-500 text-xs sm:text-sm">
                  No inventory matched your current search or category filter.
                </p>
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="px-5 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold shadow-xs hover:bg-[#E85F00] cursor-pointer"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              <div className={`grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 ${isSidebarOpen ? 'xl:grid-cols-4' : 'xl:grid-cols-5'} gap-3.5 sm:gap-5`}>
                {items.map((item) => (
                  <InventoryCard
                    key={item.id}
                    item={item}
                    displayMode={settings.display_mode}
                    onViewDetails={(it) => setDetailItem(it)}
                    onAddedToCart={(name, qty) => {
                      setCartToast(`Added ${qty}x ${name} to order.`);
                      setTimeout(() => setCartToast(null), 3000);
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-5 text-xs">
                <span className="text-slate-500">
                  Page <strong className="text-slate-900 dark:text-white">{currentPage}</strong> of <strong className="text-slate-900 dark:text-white">{totalPages}</strong> ({totalItems} total)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Previous
                  </button>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold hover:bg-slate-50 cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </main>

        </div>

      </div>

      {/* ── Mobile Slide-Out Drawer (85% Width, Max 320px) ───────────────── */}
      {isMobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileDrawerOpen(false)}
          />

          {/* Slide-out Drawer */}
          <div className="relative w-[85vw] max-w-[320px] bg-white dark:bg-slate-900 h-full shadow-2xl p-5 overflow-y-auto flex flex-col z-10 animate-in slide-in-from-left duration-250">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#FF6B00]" />
                <span>Browse Categories</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsMobileDrawerOpen(false)}
                className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1">
              {renderCategoryNav()}
            </div>

            <div className="pt-4 mt-6 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-[11px] text-slate-400">
                OKC Warehouse Ready · Same-Day Delivery
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          displayMode={settings.display_mode}
          onClose={() => setDetailItem(null)}
          onAddedToCart={(name, qty) => {
            setCartToast(`Added ${qty}x ${name} to order.`);
            setTimeout(() => setCartToast(null), 3000);
          }}
        />
      )}

      {/* Toast Notification */}
      {cartToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{cartToast}</span>
        </div>
      )}
    </section>
  );
};

export default InventorySection;
