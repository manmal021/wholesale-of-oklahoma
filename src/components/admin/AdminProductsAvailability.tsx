import React, { useState, useEffect } from 'react';
import {
  Package,
  Search,
  RefreshCw,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Ban,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  LogOut,
  FileText,
  Users,
  Layers,
  Filter,
} from 'lucide-react';
import { setAdminProductOverride, type InventoryOverrideRecord } from '../../lib/fulfillmentApi';

interface ProductItem {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  available_stock: number;
  stock_status: string;
  rate?: number | null;
  is_temporarily_blocked?: boolean;
}

export default function AdminProductsAvailability() {
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [overrides, setOverrides] = useState<InventoryOverrideRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERRIDDEN' | 'AVAILABLE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [categories, setCategories] = useState<string[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem('woo_session_token') || '';
      const authHeader: Record<string, string> = token ? { 'x-session-token': token } : {};

      const [invRes, overridesRes, metaRes] = await Promise.all([
        fetch('/api/inventory?limit=250', { headers: authHeader }),
        fetch('/api/admin/products/temporary-overrides', { headers: authHeader }),
        fetch('/api/inventory/meta'),
      ]);

      if (overridesRes.status === 401 || overridesRes.status === 403) {
        window.location.href = '/admin/login';
        return;
      }

      const invData = await invRes.json();
      const ovData = await overridesRes.json();
      const metaData = await metaRes.json();

      if (Array.isArray(invData.items)) {
        setProducts(invData.items);
      }
      if (Array.isArray(ovData.overrides)) {
        setOverrides(ovData.overrides);
      }
      if (Array.isArray(metaData.categories)) {
        setCategories(metaData.categories);
      }
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to load catalog inventory data.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSetOverride = async (
    product: ProductItem,
    statusOverride: 'AVAILABLE' | 'LOW_STOCK' | 'TEMPORARILY_UNAVAILABLE' | 'OUT_OF_STOCK',
    reasonText?: string
  ) => {
    setActionLoadingId(product.id);
    setFeedbackMessage(null);
    try {
      const isBlocked = statusOverride === 'TEMPORARILY_UNAVAILABLE' || statusOverride === 'OUT_OF_STOCK';
      await setAdminProductOverride({
        productId: product.id,
        sku: product.sku,
        productName: product.name,
        isOutOfStockOnline: isBlocked,
        statusOverride,
        reason: reasonText || `Marked ${statusOverride.replace(/_/g, ' ')} by administrator`,
      });

      setFeedbackMessage({
        type: 'success',
        text: statusOverride === 'AVAILABLE'
          ? `Product "${product.name}" online override removed. Restored to live Zoho sync.`
          : `Product "${product.name}" marked as "${statusOverride.replace(/_/g, ' ')}". Product data and physical inventory preserved.`,
      });

      await loadData();
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to update product availability.' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    try {
      localStorage.removeItem('woo_session_token');
      localStorage.removeItem('woo_user');
    } catch (_) {}
    window.location.href = '/admin/login';
  };

  // Helper to determine if a product has an active override
  const getActiveOverride = (productId: string, sku: string): InventoryOverrideRecord | undefined => {
    return overrides.find((o) => o.active && (o.productId === productId || (sku && o.sku === sku)));
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const ov = getActiveOverride(p.id, p.sku);
    const matchesSearch =
      !searchTerm ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = selectedCategory === 'ALL' || p.category === selectedCategory;

    let matchesStatus = true;
    if (statusFilter === 'OVERRIDDEN') {
      matchesStatus = Boolean(ov);
    } else if (statusFilter === 'AVAILABLE') {
      matchesStatus = !ov;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white shadow-xs">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">WHOLESALE OF OKLAHOMA</span>
              <span className="bg-orange-50 border border-orange-200 text-[#FF6B00] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Admin Portal</span>
            </div>
            <p className="text-[11px] text-slate-500">Product Storefront Availability & Manual Overrides</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <span>Live Storefront</span>
            <ExternalLink className="w-3 h-3" />
          </a>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-xs text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          <a
            href="/admin"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            Dashboard
          </a>
          <a
            href="/admin/customer-applications"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <FileText className="w-3.5 h-3.5 text-[#FF6B00]" />
            Customer Applications
          </a>
          <a
            href="/admin/customers"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-emerald-600" />
            Wholesale Customers
          </a>
          <a
            href="/admin/orders"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <Package className="w-3.5 h-3.5 text-amber-600" />
            Wholesale Orders
          </a>
          <a
            href="/admin/products"
            className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            Products / Availability
            {overrides.length > 0 && (
              <span className="bg-white text-[#FF6B00] text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                {overrides.length}
              </span>
            )}
          </a>
          <a
            href="/admin/inventory-mismatches"
            className="px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-colors shadow-xs"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            Inventory Mismatches
          </a>
        </div>

        {/* Informational Callout */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
            <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
            <span>Zoho Inventory Protection Rule</span>
          </div>
          <h2 className="text-lg font-black text-slate-900">
            Manual Storefront Availability Overrides
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl">
            When an item is physically exhausted or temporarily unavailable in the OKC warehouse, mark it <strong>Temporarily Unavailable</strong> below. This immediately prevents wholesale customer orders on the storefront without permanently altering or corrupting the authoritative Zoho inventory record or synchronized pricing.
          </p>
        </div>

        {feedbackMessage && (
          <div
            className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-2 ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        {/* Filter Controls */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-3 items-center justify-between shadow-xs">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search product name, SKU, or brand..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:border-[#FF6B00]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none focus:border-[#FF6B00]"
            >
              <option value="ALL">All Products</option>
              <option value="OVERRIDDEN">Overridden Only ({overrides.length})</option>
              <option value="AVAILABLE">Normal Live Sync</option>
            </select>

            {categories.length > 0 && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-700 font-bold focus:outline-none focus:border-[#FF6B00]"
              >
                <option value="ALL">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}

            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
              title="Refresh inventory"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Product Availability Table */}
        <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
              <p className="text-xs">Loading live catalog and manual overrides...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              No matching products found for the selected search and filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700 divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="px-6 py-3.5">Product & SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Zoho Live Stock</th>
                    <th className="px-6 py-3.5">Storefront Status</th>
                    <th className="px-6 py-3.5 text-right">Manual Override Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod) => {
                    const activeOv = getActiveOverride(prod.id, prod.sku);
                    const isBusy = actionLoadingId === prod.id;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-bold text-slate-900">{prod.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            SKU: {prod.sku || 'N/A'} {prod.brand && `• ${prod.brand}`}
                          </div>
                        </td>

                        <td className="px-6 py-4 text-slate-600">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {prod.category || 'General Wholesale'}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <div className="font-extrabold text-slate-900">
                            {prod.available_stock} <span className="font-normal text-slate-500 text-[11px]">units</span>
                          </div>
                          <div className="text-[10px] text-slate-400">Zoho Inventory Count</div>
                        </td>

                        <td className="px-6 py-4">
                          {(() => {
                            const status = activeOv?.statusOverride || (activeOv?.isOutOfStockOnline ? 'TEMPORARILY_UNAVAILABLE' : null);
                            if (status === 'TEMPORARILY_UNAVAILABLE') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <Ban className="w-3 h-3 text-amber-600" />
                                  Temporarily Unavailable
                                </span>
                              );
                            }
                            if (status === 'OUT_OF_STOCK') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                  <Ban className="w-3 h-3 text-rose-600" />
                                  Out of Stock (Manual)
                                </span>
                              );
                            }
                            if (status === 'LOW_STOCK') {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
                                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                                  Low Stock Override
                                </span>
                              );
                            }
                            if (prod.available_stock > 0) {
                              return (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Available (Zoho Live)
                                </span>
                              );
                            }
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                Out of Stock (0 Zoho)
                              </span>
                            );
                          })()}
                          {activeOv?.reason && (
                            <div className="text-[10px] text-slate-500 mt-1 max-w-xs truncate" title={activeOv.reason}>
                              Note: {activeOv.reason}
                            </div>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-2 justify-end">
                            <select
                              disabled={isBusy}
                              value={activeOv?.statusOverride || (activeOv?.isOutOfStockOnline ? 'TEMPORARILY_UNAVAILABLE' : 'AVAILABLE')}
                              onChange={(e) => handleSetOverride(prod, e.target.value as any)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-xs focus:outline-none focus:border-[#FF6B00] cursor-pointer"
                            >
                              <option value="AVAILABLE">Available (Live Zoho)</option>
                              <option value="LOW_STOCK">Low Stock</option>
                              <option value="TEMPORARILY_UNAVAILABLE">Temporarily Unavailable</option>
                              <option value="OUT_OF_STOCK">Out of Stock</option>
                            </select>

                            {activeOv && (
                              <button
                                onClick={() => handleSetOverride(prod, 'AVAILABLE', 'Cleared override by administrator')}
                                disabled={isBusy}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition-all cursor-pointer inline-flex items-center gap-1"
                                title="Reset to Live Zoho sync"
                              >
                                {isBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                                <span className="hidden sm:inline">Reset</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
