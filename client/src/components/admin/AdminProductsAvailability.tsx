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
  Pencil,
  Trash2,
  X,
} from 'lucide-react';
import { setAdminProductOverride, type InventoryOverrideRecord } from '../../lib/fulfillmentApi';

interface ProductItem {
  id: string;
  zoho_item_id?: string;
  sku: string;
  name: string;
  brand?: string;
  category?: string;
  subcategory?: string;
  description?: string;
  unit?: string;
  upc?: string;
  min_order_qty?: number;
  features?: string[];
  specs?: Record<string, string | undefined>;
  variants?: Array<{ variant_id: string; variant_name: string; variant_sku: string }>;
  available_stock: number;
  stock_status: string;
  rate?: number | null;
  zoho_rate?: number | null;
  wholesale_price?: number | null;
  retail_price?: number | null;
  retail_msrp?: number | null;
  local_stock_quantity?: number;
  zoho_available_stock?: number;
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
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [editForm, setEditForm] = useState({ localStockQuantity: '', wholesalePrice: '', retailPrice: '' });
  const [isSavingProduct, setIsSavingProduct] = useState(false);

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

  const openProductEditor = (product: ProductItem) => {
    setFeedbackMessage(null);
    setEditingProduct(product);
    setEditForm({
      localStockQuantity: String(product.local_stock_quantity ?? product.available_stock ?? 0),
      wholesalePrice: String(product.wholesale_price ?? product.rate ?? ''),
      retailPrice: String(product.retail_price ?? product.retail_msrp ?? product.rate ?? ''),
    });
  };

  const saveProductEdits = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    const localStockQuantity = Number(editForm.localStockQuantity);
    const wholesalePrice = Number(editForm.wholesalePrice);
    const retailPrice = Number(editForm.retailPrice);
    if (!Number.isSafeInteger(localStockQuantity) || localStockQuantity < 0) {
      setFeedbackMessage({ type: 'error', text: 'Local stock must be a whole number greater than or equal to zero.' });
      return;
    }
    if (![wholesalePrice, retailPrice].every((price) => Number.isFinite(price) && price > 0)) {
      setFeedbackMessage({ type: 'error', text: 'Both prices must be greater than zero.' });
      return;
    }

    setIsSavingProduct(true);
    setFeedbackMessage(null);
    try {
      const token = localStorage.getItem('woo_session_token') || '';
      const response = await fetch(`/api/inventory/admin/products/${encodeURIComponent(editingProduct.id)}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        body: JSON.stringify({ localStockQuantity, wholesalePrice, retailPrice }),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        throw new Error(data.error || data.message || 'Failed to save product changes.');
      }

      const productName = editingProduct.name;
      setEditingProduct(null);
      await loadData();
      setFeedbackMessage({ type: 'success', text: `Local stock and customer prices updated for "${productName}". Zoho values were not changed.` });
    } catch (err: any) {
      setFeedbackMessage({ type: 'error', text: err.message || 'Failed to save product changes.' });
    } finally {
      setIsSavingProduct(false);
    }
  };

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
                    <th className="px-6 py-3.5">S.N.</th>
                    <th className="px-6 py-3.5">Product & SKU</th>
                    <th className="px-6 py-3.5">Category</th>
                    <th className="px-6 py-3.5">Zoho / Local Stock</th>
                    <th className="px-6 py-3.5">Storefront Status</th>
                    <th className="px-6 py-3.5 text-right">Manual Override Controls</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredProducts.map((prod, index) => {
                    const activeOv = getActiveOverride(prod.id, prod.sku);
                    const isBusy = actionLoadingId === prod.id;

                    return (
                      <tr key={prod.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-mono text-[11px] text-slate-400">{index + 1}</div>
                        </td>
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
                            {prod.zoho_available_stock ?? prod.available_stock} <span className="font-normal text-slate-500 text-[11px]">Zoho</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-1">
                            Local: <span className="font-bold text-slate-700">{prod.local_stock_quantity ?? prod.available_stock}</span> units
                          </div>
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
                        <td className="px-6 py-4">
                          <div className="inline-flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => openProductEditor(prod)}
                              className="p-2 rounded-lg text-slate-500 hover:text-[#FF6B00] hover:bg-orange-50 transition-colors cursor-pointer"
                              title={`Edit local stock and prices for ${prod.name}`}
                              aria-label={`Edit local stock and prices for ${prod.name}`}
                            >
                              <Pencil className="w-4 h-4" aria-hidden="true" />
                            </button>
                            <span
                              className="p-2 rounded-lg text-rose-500"
                              title="Delete product (not available yet)"
                              aria-label="Delete product (not available yet)"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </span>
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

      {editingProduct && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSavingProduct) setEditingProduct(null);
          }}
        >
          <form
            onSubmit={saveProductEdits}
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl border border-slate-200"
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-5 flex items-start justify-between gap-4 rounded-t-3xl">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B00]">Storefront product settings</p>
                <h2 className="text-lg font-black text-slate-900 mt-1">Edit {editingProduct.name}</h2>
                <p className="text-xs text-slate-500 mt-1">Product details and Zoho values are read-only. Only local stock and customer prices can be changed.</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={isSavingProduct}
                className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close product editor"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {feedbackMessage?.type === 'error' && (
                <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                  {feedbackMessage.text}
                </div>
              )}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Product details · read only</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    ['Product name', editingProduct.name],
                    ['Product ID', editingProduct.id],
                    ['Zoho item ID', editingProduct.zoho_item_id || 'N/A'],
                    ['SKU', editingProduct.sku || 'N/A'],
                    ['Brand', editingProduct.brand || 'N/A'],
                    ['Category', editingProduct.category || 'General Wholesale'],
                    ['Subcategory', editingProduct.subcategory || 'N/A'],
                    ['Unit', editingProduct.unit || 'N/A'],
                    ['UPC', editingProduct.upc || 'N/A'],
                    ['Minimum order quantity', editingProduct.min_order_qty == null ? 'N/A' : String(editingProduct.min_order_qty)],
                    ['Description', editingProduct.description || 'N/A'],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                      <span className="block text-xs font-semibold text-slate-700 mt-1 break-words">{value}</span>
                    </div>
                  ))}
                </div>
                {editingProduct.features && editingProduct.features.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 mt-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Features · read only</span>
                    <span className="block text-xs font-semibold text-slate-700 mt-1">{editingProduct.features.join(' · ')}</span>
                  </div>
                )}
                {editingProduct.specs && Object.keys(editingProduct.specs).length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                    {Object.entries(editingProduct.specs).filter(([, value]) => value).map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label.replace(/_/g, ' ')}</span>
                        <span className="block text-xs font-semibold text-slate-700 mt-1">{value}</span>
                      </div>
                    ))}
                  </div>
                )}
                {editingProduct.variants && editingProduct.variants.length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 mt-3">
                    <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">Variants · read only</span>
                    <span className="block text-xs font-semibold text-slate-700 mt-1">
                      {editingProduct.variants.map((variant) => `${variant.variant_name} (${variant.variant_sku})`).join(' · ')}
                    </span>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Zoho values · read only</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    ['Zoho stock', `${editingProduct.zoho_available_stock ?? editingProduct.available_stock} units`],
                    ['Zoho item rate', editingProduct.zoho_rate == null ? 'Not available' : `$${editingProduct.zoho_rate.toFixed(2)}`],
                    ['Zoho sale rate', editingProduct.retail_msrp == null ? 'Not available' : `$${editingProduct.retail_msrp.toFixed(2)}`],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</span>
                      <span className="block text-sm font-bold text-slate-700 mt-1">{value}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Admin-maintained storefront values</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <label className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-700">Local stock quantity</span>
                    <input
                      type="number"
                      min={0}
                      max={1_000_000_000}
                      step={1}
                      required
                      value={editForm.localStockQuantity}
                      onChange={(e) => setEditForm((form) => ({ ...form, localStockQuantity: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                    />
                    <span className="block text-[10px] text-slate-400">Independent from Zoho stock</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-700">Wholesale price</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                      <input
                        type="number"
                        min={0.01}
                        max={1_000_000}
                        step="0.01"
                        required
                        value={editForm.wholesalePrice}
                        onChange={(e) => setEditForm((form) => ({ ...form, wholesalePrice: e.target.value }))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">Shown to approved wholesale customers</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className="block text-xs font-bold text-slate-700">Retail price</span>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                      <input
                        type="number"
                        min={0.01}
                        max={1_000_000}
                        step="0.01"
                        required
                        value={editForm.retailPrice}
                        onChange={(e) => setEditForm((form) => ({ ...form, retailPrice: e.target.value }))}
                        className="w-full pl-7 pr-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-[#FF6B00]"
                      />
                    </div>
                    <span className="block text-[10px] text-slate-400">Shown to visitors and other non-wholesale roles</span>
                  </label>
                </div>
              </section>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-end gap-2 rounded-b-3xl">
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                disabled={isSavingProduct}
                className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-bold hover:bg-slate-100 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingProduct}
                className="px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold hover:bg-[#E85F00] disabled:opacity-60 inline-flex items-center gap-2"
              >
                {isSavingProduct && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
