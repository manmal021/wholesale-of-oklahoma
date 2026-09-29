import React, { useState } from 'react';
import {
  Package,
  Check,
  Eye,
  ShoppingBag,
  XCircle,
  Layers,
  Lock,
  LogIn,
  UserCheck,
} from 'lucide-react';
import type { InventoryItem, QuantityDisplayMode } from '../../types/inventory';
import { addToOrderDirect } from '../../lib/mangoAI';

interface InventoryCardProps {
  item: InventoryItem;
  displayMode: QuantityDisplayMode;
  onViewDetails: (item: InventoryItem) => void;
  onAddedToCart?: (name: string, qty: number) => void;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
  item,
  displayMode,
  onViewDetails,
  onAddedToCart,
}) => {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const isOutOfStock = item.stock_status === 'out_of_stock' || item.available_stock <= 0;
  const isLowStock = item.stock_status === 'low_stock';

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToOrderDirect(item, qty);
    setAdded(true);
    if (onAddedToCart) onAddedToCart(item.name, qty);
    setTimeout(() => setAdded(false), 2200);
  };

  const renderStockDot = () => {
    if (isOutOfStock) return <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />;
    if (isLowStock) return <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />;
    return <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />;
  };

  const renderStockLabel = () => {
    if (isOutOfStock) return 'Out of Stock';
    if (isLowStock) return displayMode === 'exact_quantity' ? `Low · ${item.available_stock}` : 'Low Stock';
    return displayMode === 'exact_quantity' ? `${item.available_stock} in stock` : 'In Stock';
  };

  return (
    <div
      className={`raycast-card raycast-card-glint group flex flex-col justify-between ${
        isOutOfStock ? 'opacity-60' : ''
      }`}
      style={{ height: '100%' }}
    >
      {/* Image area — compact */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{
          aspectRatio: '4/3',
          background: 'var(--bg-tertiary)',
          borderBottom: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
        }}
        onClick={() => {
          onViewDetails(item);
          window.history.pushState({}, '', `/products/${item.id || item.sku}`);
        }}
      >
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.name}
            width={400}
            height={300}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-contain p-3 group-hover:scale-[1.04] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
            <span
              className="text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md"
              style={{ color: 'var(--accent-primary)', background: 'var(--accent-subtle)', border: '1px solid var(--accent-subtle-border)' }}
            >
              {item.brand}
            </span>
            <Package className="w-10 h-10" style={{ color: 'var(--border-light)' }} strokeWidth={1.5} />
            <span className="text-[11px] font-medium" style={{ color: 'var(--text-faint)' }}>
              Image Coming Soon
            </span>
          </div>
        )}

        {/* Overlay: badge + stock in corner */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none">
          {item.badge ? (
            <span
              className="text-[10px] font-extrabold px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--surface-overlay)',
                backdropFilter: 'blur(8px)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {item.badge}
            </span>
          ) : <span />}

          {/* Stock badge */}
          <span
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
            style={{
              background: 'var(--surface-overlay)',
              backdropFilter: 'blur(8px)',
              color: isOutOfStock ? '#ef4444' : isLowStock ? '#f59e0b' : '#10b981',
              border: `1px solid ${isOutOfStock ? 'rgba(239,68,68,0.25)' : isLowStock ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.25)'}`,
            }}
          >
            {renderStockDot()}
            {renderStockLabel()}
          </span>
        </div>

        {/* Hover quick-view overlay */}
        <div
          className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
          style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        >
          <span
            className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-full"
            style={{ background: 'var(--surface-card)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
          >
            <Eye className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
            View Specs
          </span>
        </div>
      </div>

      {/* Content area */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {/* Brand + SKU row */}
        <div className="flex items-center justify-between gap-2">
          <span
            className="text-[10px] uppercase font-black tracking-wider"
            style={{ color: 'var(--accent-primary)' }}
          >
            {item.brand}
          </span>
          <span
            className="font-mono text-[9px] px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}
          >
            {item.sku}
          </span>
        </div>

        {/* Product name */}
        <h3
          className="text-sm font-bold leading-tight line-clamp-2 group-hover:text-[var(--accent-primary)] transition-colors cursor-pointer"
          style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onClick={() => {
            onViewDetails(item);
            window.history.pushState({}, '', `/products/${item.id || item.sku}`);
          }}
        >
          {item.name}
        </h3>

        {/* Tags */}
        <div className="flex flex-wrap items-center gap-1">
          <span
            className="text-[9px] font-semibold px-1.5 py-0.5 rounded"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
          >
            {item.category}
          </span>
          {item.subcategory && (
            <span
              className="text-[9px] font-medium px-1.5 py-0.5 rounded"
              style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            >
              {item.subcategory}
            </span>
          )}
          {item.variants && item.variants.length > 0 && (
            <span className="text-[9px] font-medium flex items-center gap-1 ml-auto" style={{ color: 'var(--text-faint)' }}>
              <Layers className="w-2.5 h-2.5" style={{ color: 'var(--accent-primary)' }} />
              {item.variants.length} options
            </span>
          )}
        </div>

        {/* Pricing section */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem', marginTop: 'auto' }}>
          {item.has_pricing_access && typeof item.rate === 'number' ? (
            <div className="flex items-baseline justify-between">
              <div>
                <span className="label-overline block mb-0.5">Wholesale</span>
                <span
                  className="text-lg font-black"
                  style={{ color: 'var(--text-primary)', fontFamily: "'Plus Jakarta Sans', sans-serif", letterSpacing: '-0.02em' }}
                >
                  ${item.rate.toFixed(2)}
                </span>
              </div>
              {item.retail_msrp && (
                <div className="text-right">
                  <span className="label-overline block mb-0.5">MSRP</span>
                  <span className="text-xs line-through" style={{ color: 'var(--text-faint)', fontWeight: 600 }}>
                    ${item.retail_msrp.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div
              className="rounded-lg p-2.5 text-center"
              style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}
            >
              <span className="flex items-center justify-center gap-1.5 text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                <Lock className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                Wholesale Pricing
              </span>
              <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-faint)' }}>
                Restricted to verified accounts
              </span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        {item.has_pricing_access && typeof item.rate === 'number' ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {/* Qty stepper — Raycast compact */}
              <div
                className="flex items-center gap-1 rounded-lg px-2 py-1.5"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  opacity: isOutOfStock ? 0.4 : 1,
                  pointerEvents: isOutOfStock ? 'none' : 'auto',
                }}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || isOutOfStock}
                  className="w-4 h-4 text-xs font-bold flex items-center justify-center rounded disabled:opacity-30 cursor-pointer transition-colors hover:text-[var(--accent-primary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  −
                </button>
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  disabled={isOutOfStock}
                  aria-label={`Select quantity for ${item.name}`}
                  className="bg-transparent text-xs font-bold border-0 outline-none cursor-pointer px-0.5"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n} {n === 1 ? 'box' : 'boxes'}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(50, q + 1))}
                  disabled={qty >= 50 || isOutOfStock}
                  className="w-4 h-4 text-xs font-bold flex items-center justify-center rounded disabled:opacity-30 cursor-pointer transition-colors hover:text-[var(--accent-primary)]"
                  style={{ color: 'var(--text-muted)' }}
                >
                  +
                </button>
              </div>

              {/* Add to cart */}
              {isOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-not-allowed"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-faint)', border: '1px solid var(--border-subtle)' }}
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Out of Stock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                  style={{
                    background: added ? '#059669' : 'var(--accent-primary)',
                    color: '#fff',
                    boxShadow: added ? '0 4px 12px rgba(5,150,105,0.3)' : '0 4px 12px rgba(249,115,22,0.25)',
                  }}
                >
                  {added ? (
                    <><Check className="w-3.5 h-3.5" /> Added {qty}!</>
                  ) : (
                    <><ShoppingBag className="w-3.5 h-3.5" /> Add to Cart</>
                  )}
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => onViewDetails(item)}
              className="w-full text-center text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--accent-primary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-faint)')}
            >
              <Eye className="w-3 h-3" />
              View Specs & Bulk Pricing
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                className="py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
              >
                <LogIn className="w-3.5 h-3.5" style={{ color: 'var(--accent-primary)' }} />
                Login
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-wholesale-application'))}
                className="py-2 px-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                <UserCheck className="w-3.5 h-3.5" />
                Apply
              </button>
            </div>
            <button
              type="button"
              onClick={() => onViewDetails(item)}
              className="w-full text-center text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer"
              style={{ color: 'var(--text-faint)' }}
            >
              <Eye className="w-3 h-3" />
              View Specs & Pack Info
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
