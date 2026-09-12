import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Check,
  ShoppingBag,
  ShieldCheck,
  Phone,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle,
  Truck,
  Building,
} from 'lucide-react';
import type { InventoryItem, InventoryVariant, QuantityDisplayMode } from '../../types/inventory';
import { addToOrderDirect } from '../../lib/mangoAI';

interface ProductDetailModalProps {
  item: InventoryItem | null;
  displayMode: QuantityDisplayMode;
  onClose: () => void;
  onAddedToCart?: (name: string, qty: number) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  item,
  displayMode,
  onClose,
  onAddedToCart,
}) => {
  const [selectedVariant, setSelectedVariant] = useState<InventoryVariant | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (item) {
      setActiveImage(item.image_url);
      setQty(item.min_order_qty || 1);
      if (item.variants && item.variants.length > 0) {
        setSelectedVariant(item.variants[0]);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [item]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!item) return null;

  // Active stock based on selected variant or root item
  const currentStock = selectedVariant ? selectedVariant.available_stock : item.available_stock;
  const currentStatus = selectedVariant ? selectedVariant.stock_status : item.stock_status;
  const currentSku = selectedVariant ? selectedVariant.variant_sku : item.sku;
  const currentRate = selectedVariant?.rate || item.rate;
  const isOutOfStock = currentStatus === 'out_of_stock' || currentStock <= 0;
  const isLowStock = currentStatus === 'low_stock';

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    const itemName = selectedVariant
      ? `${item.name} (${selectedVariant.variant_name})`
      : item.name;
    const chosenRate = selectedVariant?.rate || item.rate;
    addToOrderDirect(item, qty, selectedVariant?.variant_name, chosenRate);
    setAdded(true);
    if (onAddedToCart) {
      onAddedToCart(itemName, qty);
    }
    setTimeout(() => setAdded(false), 2500);
  };

  const handleScrollToOrder = () => {
    onClose();
    const el = document.getElementById('direct-order-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#0f172A]/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 text-[#0f172A] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
          {/* Left Column: Image Gallery & Badges */}
          <div className="md:col-span-5 bg-[#F8FAFC] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-200">
            <div>
              {/* Main Image View */}
              <div className="relative aspect-square w-full bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex items-center justify-center overflow-hidden">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-16 h-16 text-slate-300" />
                )}

                {item.badge && (
                  <span className="absolute top-3 left-3 bg-[#0f172A] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Image Thumbnails Gallery */}
              {item.gallery_images && item.gallery_images.length > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  {item.gallery_images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImage(img)}
                      className={`w-14 h-14 rounded-xl border-2 p-1 overflow-hidden transition-all cursor-pointer ${
                        activeImage === img
                          ? 'border-[#F97316] ring-2 ring-[#F97316]/30'
                          : 'border-transparent bg-white hover:border-slate-300'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wholesale Trust & Dispatch Badges */}
            <div className="mt-6 pt-6 border-t border-slate-200 space-y-2.5 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#F97316]" />
                <span className="font-semibold text-[#0f172A]">Licensed Oklahoma Wholesaler</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#F97316]" />
                <span>Immediate OKC Dispatch · 4500 S Bryant Ave</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#F97316]" />
                <span>Warehouse Catalog Ref: <span className="font-mono">{item.zoho_item_id}</span></span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Info & Wholesale Ordering */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Category, Brand, and Stock Status Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#F97316]">
                    {item.brand}
                  </span>
                  <span className="text-slate-300">·</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {item.category}
                  </span>
                </div>

                {/* Stock Status Pill */}
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    {displayMode === 'exact_quantity'
                      ? `Low Stock · ${currentStock} units left`
                      : 'Low Stock'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {displayMode === 'exact_quantity'
                      ? `${currentStock} in stock (OKC Warehouse)`
                      : 'In Stock (OKC)'}
                  </span>
                )}
              </div>

              {/* Product Title & Active SKU */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold text-[#0f172A] tracking-tight">
                  {item.name}
                </h2>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded font-bold border border-slate-200">
                    SKU: {currentSku}
                  </span>
                  {item.upc && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      UPC: {item.upc}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Display */}
              <div className="p-4 bg-orange-50/50 rounded-2xl border border-orange-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-orange-950/70 block">
                    Direct Wholesale Price
                  </span>
                  <span className="text-3xl font-black text-[#0f172A]">
                    ${currentRate.toFixed(2)}
                  </span>
                  <span className="text-xs text-slate-500 font-medium ml-1">/ unit</span>
                </div>

                {item.retail_msrp && (
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Estimated Retail MSRP
                    </span>
                    <span className="text-sm font-semibold text-slate-500 line-through">
                      ${item.retail_msrp.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-[#F97316] font-bold block">
                      ~{Math.round(((item.retail_msrp - currentRate) / item.retail_msrp) * 100)}% Profit Margin
                    </span>
                  </div>
                )}
              </div>

              {/* Bulk Pricing Tier Table */}
              {item.bulk_pricing && item.bulk_pricing.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Tiered Wholesale Pricing
                  </h4>
                  <div className="grid grid-cols-3 gap-2">
                    {item.bulk_pricing.map((tier, idx) => (
                      <div
                        key={idx}
                        className="bg-white p-2.5 rounded-xl border border-slate-200 text-center shadow-2xs"
                      >
                        <span className="text-[10px] text-slate-500 block font-semibold">
                          {tier.label}
                        </span>
                        <span className="text-sm font-black text-[#0f172A]">
                          ${tier.pricePerUnit.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-[#F97316] block font-bold">
                          ea
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Variants Selector (Flavors / Options) */}
              {item.variants && item.variants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#0f172A]">
                      Select Flavor / Variant:
                    </span>
                    {selectedVariant && (
                      <span className="text-xs text-[#F97316] font-semibold">
                        {selectedVariant.variant_name} ·{' '}
                        {selectedVariant.stock_status === 'out_of_stock'
                          ? 'Out of Stock'
                          : displayMode === 'exact_quantity'
                          ? `${selectedVariant.available_stock} in stock`
                          : 'In Stock'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 rounded-xl border border-slate-200">
                    {item.variants.map((v) => {
                      const isVarSelected = selectedVariant?.variant_id === v.variant_id;
                      const isVarOOS = v.stock_status === 'out_of_stock';
                      return (
                        <button
                          key={v.variant_id}
                          type="button"
                          onClick={() => setSelectedVariant(v)}
                          className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                            isVarSelected
                              ? 'bg-[#0f172A] text-white shadow-sm'
                              : isVarOOS
                              ? 'bg-slate-100 text-slate-400 line-through'
                              : 'bg-white text-slate-700 border border-slate-200 hover:border-[#F97316]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isVarOOS ? 'bg-rose-400' : 'bg-emerald-500'
                            }`}
                          />
                          {v.variant_name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Product Specifications */}
              {item.specs && Object.keys(item.specs).length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#F8FAFC] p-3 rounded-xl border border-slate-200">
                    {item.specs.puffs && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Estimated Puffs</span>
                        <span className="font-bold text-[#0f172A]">{item.specs.puffs}</span>
                      </div>
                    )}
                    {item.specs.nicotine && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nicotine Strength</span>
                        <span className="font-bold text-[#0f172A]">{item.specs.nicotine}</span>
                      </div>
                    )}
                    {item.specs.case_pack && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Case Packaging</span>
                        <span className="font-bold text-[#0f172A]">{item.specs.case_pack}</span>
                      </div>
                    )}
                    {item.specs.origin && (
                      <div>
                        <span className="text-slate-400 block text-[10px]">Distribution Origin</span>
                        <span className="font-bold text-[#0f172A]">{item.specs.origin}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Quantity Selector, Add to Cart & Dispatch CTA */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-3">
                {/* Stepper */}
                <div
                  className={`flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-3 py-2 ${
                    isOutOfStock ? 'opacity-40 pointer-events-none' : ''
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    disabled={qty <= 1 || isOutOfStock}
                    className="w-7 h-7 rounded-full bg-white shadow-2xs text-[#0f172A] font-bold text-sm flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    −
                  </button>
                  <span className="text-sm font-bold text-[#0f172A] px-2 min-w-[2.5rem] text-center">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQty((q) => Math.min(100, q + 1))}
                    disabled={qty >= 100 || isOutOfStock}
                    className="w-7 h-7 rounded-full bg-white shadow-2xs text-[#0f172A] font-bold text-sm flex items-center justify-center hover:bg-slate-100 disabled:opacity-30 transition-colors cursor-pointer"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                {isOutOfStock ? (
                  <button
                    type="button"
                    disabled
                    className="flex-1 py-3 bg-slate-200 text-slate-500 text-sm font-bold rounded-full flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <AlertCircle className="w-4 h-4 text-slate-400" />
                    Currently Out of Stock
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`flex-1 py-3 text-white text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                      added
                        ? 'bg-emerald-600'
                        : 'bg-[#F97316] hover:bg-[#ea580c]'
                    }`}
                  >
                    {added ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        Added {qty} Units to Order Draft!
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4 text-white" />
                        Add {qty} to Wholesale Cart · ${(currentRate * qty).toFixed(2)}
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Order Form Shortcut & Dispatch Phone */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <button
                  type="button"
                  onClick={handleScrollToOrder}
                  className="text-[#F97316] font-bold hover:underline cursor-pointer"
                >
                  Need pallet pricing? Submit custom batch request →
                </button>

                <a
                  href="tel:4057682975"
                  className="font-bold text-[#0f172A] hover:text-[#F97316] flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-[#F97316]" />
                  (405) 768-2975
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
