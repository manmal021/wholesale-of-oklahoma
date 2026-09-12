import React, { useState } from 'react';
import {
  Package,
  Check,
  Eye,
  ShoppingBag,
  AlertTriangle,
  XCircle,
  Sparkles,
  Tag,
  Layers,
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
    if (onAddedToCart) {
      onAddedToCart(item.name, qty);
    }
    setTimeout(() => setAdded(false), 2200);
  };

  // Stock status text & style according to admin setting
  const renderStockIndicator = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-rose-500" />
          Out of Stock
        </span>
      );
    }

    if (isLowStock) {
      const label =
        displayMode === 'exact_quantity'
          ? `Low Stock · ${item.available_stock} left`
          : 'Low Stock';
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          {label}
        </span>
      );
    }

    const label =
      displayMode === 'exact_quantity'
        ? `${item.available_stock} in stock (OKC)`
        : 'In Stock';

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        {label}
      </span>
    );
  };

  return (
    <div
      className={`group relative bg-white rounded-[28px] border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isOutOfStock
          ? 'border-slate-200 opacity-90'
          : 'border-slate-200 hover:border-[#F97316]/50 hover:shadow-xl shadow-xs'
      }`}
    >
      {/* Top Media Preview */}
      <div className="relative aspect-[4/3] bg-gradient-to-br from-slate-50 to-slate-100 overflow-hidden flex items-center justify-center p-3">
        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.name}
            onError={() => setImgError(true)}
            loading="lazy"
            className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
            <Package className="w-10 h-10 stroke-[1.5]" />
            <span className="text-[11px] font-semibold text-slate-500">
              Wholesale Stock
            </span>
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {item.badge ? (
            <span className="bg-[#0f172A]/90 backdrop-blur-md text-white text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-white/10 shadow-sm">
              {item.badge}
            </span>
          ) : (
            <span />
          )}

          {renderStockIndicator()}
        </div>

        {/* Quick View Floating Overlay on Hover */}
        <button
          type="button"
          onClick={() => onViewDetails(item)}
          className="absolute inset-0 bg-[#0f172A]/40 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
          aria-label={`View details for ${item.name}`}
        >
          <span className="bg-[#0f172A] text-white px-4 py-2 rounded-full border border-slate-700 shadow-lg flex items-center gap-1.5 hover:bg-[#1e293b] transition-colors">
            <Eye className="w-3.5 h-3.5 text-[#F97316]" />
            View Specifications
          </span>
        </button>
      </div>

      {/* Main Content Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & SKU Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs uppercase font-extrabold tracking-wider text-[#F97316]">
              {item.brand}
            </span>
            <span className="font-mono text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200 select-all font-semibold">
              SKU: {item.sku}
            </span>
          </div>

          {/* Product Title */}
          <h3
            onClick={() => onViewDetails(item)}
            className="text-lg font-bold text-[#0f172A] leading-snug group-hover:text-[#F97316] transition-colors cursor-pointer line-clamp-2"
          >
            {item.name}
          </h3>

          {/* Category & Attributes Tag Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200/60">
              {item.category}
            </span>
            {item.subcategory && (
              <span className="text-[10px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                {item.subcategory}
              </span>
            )}
            {item.variants && item.variants.length > 0 && (
              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1 ml-auto">
                <Layers className="w-3 h-3 text-slate-400" />
                {item.variants.length} flavors/variants
              </span>
            )}
          </div>

          {/* Wholesale Pricing Header */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-baseline justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
                Wholesale Unit
              </span>
              <span className="text-xl font-black text-[#0f172A] tracking-tight">
                ${item.rate.toFixed(2)}
              </span>
            </div>

            {item.bulk_pricing && item.bulk_pricing.length > 1 && (
              <div className="text-right">
                <span className="text-[10px] text-emerald-700 font-bold block">
                  Case Price: ${item.bulk_pricing[item.bulk_pricing.length - 1].pricePerUnit.toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-400">
                  {item.bulk_pricing[item.bulk_pricing.length - 1].label}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Action Controls Footer */}
        <div className="mt-5 space-y-2.5">
          <div className="flex items-center gap-2">
            {/* Quantity Stepper (disabled if Out of Stock) */}
            <div
              className={`flex items-center gap-1 bg-white border border-slate-200 rounded-full px-2 py-1 shadow-2xs ${
                isOutOfStock ? 'opacity-40 pointer-events-none' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1 || isOutOfStock}
                className="w-5 h-5 rounded-full bg-slate-100 text-[#0f172A] font-bold text-xs flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              >
                −
              </button>
              <select
                value={qty}
                onChange={(e) => setQty(Number(e.target.value))}
                disabled={isOutOfStock}
                aria-label={`Select quantity for ${item.name}`}
                className="bg-transparent text-xs font-bold text-[#0f172A] border-0 outline-none cursor-pointer px-1"
              >
                {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'box' : 'boxes'}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(50, q + 1))}
                disabled={qty >= 50 || isOutOfStock}
                className="w-5 h-5 rounded-full bg-slate-100 text-[#0f172A] font-bold text-xs flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 transition-colors cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Add to Cart or Out of Stock Button */}
            {isOutOfStock ? (
              <button
                type="button"
                disabled
                className="flex-1 py-2 bg-slate-200 text-slate-500 text-xs font-bold rounded-full flex items-center justify-center gap-1.5 cursor-not-allowed"
              >
                <XCircle className="w-3.5 h-3.5 text-slate-400" />
                Out of Stock
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAddToCart}
                className={`flex-1 py-2 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                  added
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0f172A] hover:bg-[#1e293b] text-white'
                }`}
              >
                {added ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Added {qty}!
                  </>
                ) : (
                  <>
                    <ShoppingBag className="w-3.5 h-3.5 text-[#F97316]" />
                    Add to Cart
                  </>
                )}
              </button>
            )}
          </div>

          {/* View Product Details Link */}
          <button
            type="button"
            onClick={() => onViewDetails(item)}
            className="w-full py-1 text-center text-[11px] font-bold text-[#F97316] hover:text-[#ea580c] transition-colors flex items-center justify-center gap-1 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>View Specifications & Bulk Pricing</span>
          </button>
        </div>
      </div>
    </div>
  );
};
