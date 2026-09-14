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
    if (onAddedToCart) {
      onAddedToCart(item.name, qty);
    }
    setTimeout(() => setAdded(false), 2200);
  };

  // Stock status text & style according to admin setting
  const renderStockIndicator = () => {
    if (isOutOfStock) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/60 border border-rose-800/60 px-2.5 py-1 rounded-full">
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
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/60 border border-amber-700/60 px-2.5 py-1 rounded-full">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          {label}
        </span>
      );
    }

    const label =
      displayMode === 'exact_quantity'
        ? `${item.available_stock} in stock (OKC)`
        : 'In Stock';

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700/60 px-2.5 py-1 rounded-full">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        {label}
      </span>
    );
  };

  return (
    <div
      className={`group relative bg-[#15191F] rounded-2xl border transition-all duration-300 flex flex-col justify-between overflow-hidden ${
        isOutOfStock
          ? 'border-[#2A3038] opacity-80'
          : 'border-[#2A3038] hover:border-[#FF6B00]/60 hover:shadow-xl shadow-lg hover:shadow-[#FF6B00]/5'
      }`}
    >
      {/* Top Media Preview */}
      <div className="relative aspect-[4/3] bg-[#1B2027] overflow-hidden flex items-center justify-center p-3 border-b border-[#2A3038]">
        <a
          href={`/products/${item.id || item.sku}`}
          onClick={(e) => {
            if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
              e.preventDefault();
              onViewDetails(item);
              window.history.pushState({}, '', `/products/${item.id || item.sku}`);
            }
          }}
          className="w-full h-full flex items-center justify-center cursor-pointer"
          aria-label={`View details for ${item.name}`}
        >
          {item.image_url && !imgError ? (
            <img
              src={item.image_url}
              alt={item.name}
              width={400}
              height={300}
              onError={() => setImgError(true)}
              loading="lazy"
              className="w-full h-full object-contain rounded-xl group-hover:scale-[1.03] transition-transform duration-300 ease-out"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-[#858C96] gap-2 py-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FF6B00] bg-[#0B0D10] px-2.5 py-1 rounded-md border border-[#2A3038]">
                {item.brand}
              </span>
              <Package className="w-10 h-10 text-[#858C96]/60 stroke-[1.5]" />
              <span className="text-[11px] font-semibold text-[#858C96]">
                Image Coming Soon
              </span>
            </div>
          )}
        </a>

        {/* Top Badges Overlay */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
          {item.badge ? (
            <span className="bg-[#0B0D10]/90 backdrop-blur-md text-[#F7F7F5] text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-[#2A3038] shadow-sm">
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
          className="absolute inset-0 bg-[#0B0D10]/60 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-2 text-[#F7F7F5] font-bold text-xs uppercase tracking-wider cursor-pointer"
          aria-label={`View details for ${item.name}`}
        >
          <span className="bg-[#1B2027] text-[#F7F7F5] px-4 py-2 rounded-full border border-[#353C46] shadow-lg flex items-center gap-1.5 hover:border-[#FF6B00] transition-colors">
            <Eye className="w-3.5 h-3.5 text-[#FF6B00]" />
            View Specifications
          </span>
        </button>
      </div>

      {/* Main Content Info */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Brand & SKU Header */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs uppercase font-black tracking-wider text-[#FF6B00]">
              {item.brand}
            </span>
            <span className="font-mono text-[10px] bg-[#1B2027] text-[#858C96] px-2 py-0.5 rounded border border-[#2A3038] select-all font-semibold">
              SKU: {item.sku}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="text-base font-bold text-[#F7F7F5] leading-snug group-hover:text-[#FF6B00] transition-colors line-clamp-2">
            <a
              href={`/products/${item.id || item.sku}`}
              onClick={(e) => {
                if (!e.ctrlKey && !e.metaKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  onViewDetails(item);
                  window.history.pushState({}, '', `/products/${item.id || item.sku}`);
                }
              }}
              className="hover:underline focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/40 rounded"
            >
              {item.name}
            </a>
          </h3>

          {/* Category & Attributes Tag Row */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
            <span className="text-[10px] font-semibold bg-[#1B2027] text-[#B8BDC5] px-2 py-0.5 rounded border border-[#2A3038]">
              {item.category}
            </span>
            {item.subcategory && (
              <span className="text-[10px] font-medium bg-[#1B2027] text-[#858C96] px-2 py-0.5 rounded border border-[#2A3038]">
                {item.subcategory}
              </span>
            )}
            {item.variants && item.variants.length > 0 && (
              <span className="text-[10px] font-medium text-[#858C96] flex items-center gap-1 ml-auto">
                <Layers className="w-3 h-3 text-[#FF6B00]" />
                {item.variants.length} options
              </span>
            )}
          </div>

          {/* Wholesale Pricing Header */}
          {item.has_pricing_access && typeof item.rate === 'number' ? (
            <div className="mt-4 pt-3 border-t border-[#2A3038] flex items-baseline justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#858C96] block">
                  Wholesale Unit
                </span>
                <span className="text-xl font-black text-[#F7F7F5] tracking-tight">
                  ${item.rate.toFixed(2)}
                </span>
              </div>

              {item.bulk_pricing && item.bulk_pricing.length > 1 && (
                <div className="text-right">
                  <span className="text-[10px] text-emerald-400 font-bold block">
                    Case Price: ${item.bulk_pricing[item.bulk_pricing.length - 1].pricePerUnit.toFixed(2)}
                  </span>
                  <span className="text-[9px] text-[#858C96]">
                    {item.bulk_pricing[item.bulk_pricing.length - 1].label}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 pt-3 border-t border-[#2A3038]">
              <div className="bg-[#1B2027] border border-[#2A3038] rounded-xl p-2.5 text-center">
                <span className="inline-flex items-center justify-center gap-1.5 text-xs font-bold text-[#F7F7F5]">
                  <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                  Wholesale Pricing Available
                </span>
                <span className="text-[10px] text-[#858C96] block mt-0.5">
                  Restricted to verified business accounts
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Action Controls Footer */}
        {item.has_pricing_access && typeof item.rate === 'number' ? (
          <div className="mt-5 space-y-2.5">
            <div className="flex items-center gap-2">
              {/* Quantity Stepper (disabled if Out of Stock) */}
              <div
                className={`flex items-center gap-1 bg-[#1B2027] border border-[#353C46] rounded-full px-2 py-1 ${
                  isOutOfStock ? 'opacity-40 pointer-events-none' : ''
                }`}
              >
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || isOutOfStock}
                  className="w-5 h-5 rounded-full bg-[#2A3038] text-[#F7F7F5] font-bold text-xs flex items-center justify-center hover:bg-[#353C46] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  −
                </button>
                <select
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  disabled={isOutOfStock}
                  aria-label={`Select quantity for ${item.name}`}
                  className="bg-transparent text-xs font-bold text-[#F7F7F5] border-0 outline-none cursor-pointer px-1"
                >
                  {Array.from({ length: 15 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n} className="bg-[#1B2027] text-[#F7F7F5]">
                      {n} {n === 1 ? 'box' : 'boxes'}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.min(50, q + 1))}
                  disabled={qty >= 50 || isOutOfStock}
                  className="w-5 h-5 rounded-full bg-[#2A3038] text-[#F7F7F5] font-bold text-xs flex items-center justify-center hover:bg-[#353C46] disabled:opacity-30 transition-colors cursor-pointer"
                >
                  +
                </button>
              </div>

              {/* Add to Cart or Out of Stock Button */}
              {isOutOfStock ? (
                <button
                  type="button"
                  disabled
                  className="flex-1 py-2 bg-[#2A3038] text-[#858C96] text-xs font-bold rounded-full flex items-center justify-center gap-1.5 cursor-not-allowed"
                >
                  <XCircle className="w-3.5 h-3.5 text-[#858C96]" />
                  Out of Stock
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className={`flex-1 py-2 text-white text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm ${
                    added
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#FF6B00] hover:bg-[#E85F00] text-white'
                  }`}
                >
                  {added ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Added {qty}!
                    </>
                  ) : (
                    <>
                      <ShoppingBag className="w-3.5 h-3.5 text-white" />
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
              className="w-full py-1 text-center text-[11px] font-bold text-[#FF6B00] hover:text-[#E85F00] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>View Specifications & Bulk Pricing</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-login-modal'))}
                className="py-2.5 px-2 bg-[#1B2027] hover:bg-[#222932] border border-[#353C46] text-[#F7F7F5] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-[#FF6B00]" />
                <span>Login to View Pricing</span>
              </button>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent('open-wholesale-application'))}
                className="py-2.5 px-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Apply for Wholesale Account</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onViewDetails(item)}
              className="w-full py-1 text-center text-[11px] font-bold text-[#858C96] hover:text-[#F7F7F5] transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-[#FF6B00]" />
              <span>View Specifications & Pack Info</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
