import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Check,
  ShoppingBag,
  ShieldCheck,
  Phone,
  Lock,
  LogIn,
  UserCheck,
  Truck,
  Building,
  AlertCircle,
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
      setActiveImage(item.image_url || '');
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
  const currentRate = selectedVariant?.rate ?? item.rate;
  const hasPricingAccess = item.has_pricing_access === true && typeof currentRate === 'number';
  const isOutOfStock = currentStatus === 'out_of_stock' || currentStock <= 0;
  const isLowStock = currentStatus === 'low_stock';

  const handleAddToCart = () => {
    if (isOutOfStock || !hasPricingAccess || typeof currentRate !== 'number') return;
    const itemName = selectedVariant
      ? `${item.name} (${selectedVariant.variant_name})`
      : item.name;
    addToOrderDirect(item, qty, selectedVariant?.variant_name, currentRate);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-product-title">
      {/* Dark backdrop overlay */}
      <div
        className="fixed inset-0 bg-[#0B0D10]/85 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-4xl bg-[#1B2027] rounded-[28px] shadow-2xl border border-[#2A3038] overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 my-auto text-[#F7F7F5]">
        {/* Header Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-[#15191F] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] flex items-center justify-center transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 max-h-[90vh] overflow-y-auto">
          {/* Left Column: Image Gallery & Badges */}
          <div className="md:col-span-5 bg-[#15191F] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#2A3038]">
            <div>
              {/* Main Image View */}
              <div className="relative aspect-square w-full bg-[#0B0D10] rounded-2xl p-4 border border-[#2A3038] flex items-center justify-center overflow-hidden">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={item.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
                    <div className="w-14 h-14 rounded-2xl bg-[#1B2027] border border-[#2A3038] flex items-center justify-center text-[#858C96]">
                      <Package className="w-7 h-7" />
                    </div>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] block mb-1">
                        {item.brand}
                      </span>
                      <p className="text-xs font-medium text-[#858C96]">Image Coming Soon</p>
                    </div>
                  </div>
                )}

                {item.badge && (
                  <span className="absolute top-3 left-3 bg-[#FF6B00] text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider shadow-sm">
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
                          ? 'border-[#FF6B00] ring-2 ring-[#FF6B00]/30 bg-[#0B0D10]'
                          : 'border-[#2A3038] bg-[#0B0D10] hover:border-[#353C46]'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wholesale Trust & Dispatch Badges */}
            <div className="mt-6 pt-6 border-t border-[#2A3038] space-y-2.5 text-xs text-[#B8BDC5]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span className="font-semibold text-[#F7F7F5]">Licensed Oklahoma Wholesaler</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span>OKC Warehouse Dispatch · 4500 S Bryant Ave</span>
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <span>Catalog SKU: <span className="font-mono text-[#F7F7F5]">{currentSku}</span></span>
              </div>
            </div>
          </div>

          {/* Right Column: Product Info & Wholesale Ordering */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Breadcrumb Hierarchy: Home > Inventory > Brands > [Brand] > [Product] */}
              <nav aria-label="Product Breadcrumbs" className="flex items-center gap-1.5 text-xs text-[#858C96] pb-2 border-b border-[#2A3038]/60 flex-wrap">
                <a
                  href="#overview"
                  onClick={onClose}
                  className="hover:text-[#FF6B00] transition-colors font-medium"
                >
                  Home
                </a>
                <span className="text-[#353C46]">/</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('woo-select-brand', { detail: 'All' }));
                    const el = document.getElementById('inventory');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer font-medium"
                >
                  Inventory
                </button>
                <span className="text-[#353C46]">/</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('woo-select-brand', { detail: 'All' }));
                    const el = document.getElementById('inventory');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="hover:text-[#FF6B00] transition-colors cursor-pointer font-medium"
                >
                  Brands
                </button>
                <span className="text-[#353C46]">/</span>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    window.dispatchEvent(new CustomEvent('woo-select-brand', { detail: item.brand }));
                    const el = document.getElementById('inventory');
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="text-[#FF6B00] font-bold hover:underline cursor-pointer"
                >
                  {item.brand}
                </button>
                <span className="text-[#353C46]">/</span>
                <span className="text-[#F7F7F5] font-semibold truncate max-w-[180px] sm:max-w-[240px]">
                  {item.name}
                </span>
              </nav>

              {/* Category, Brand, and Stock Status Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#FF6B00]">
                    {item.brand}
                  </span>
                  <span className="text-[#353C46]">·</span>
                  <span className="text-xs font-semibold text-[#858C96]">
                    {item.category}
                  </span>
                </div>

                {/* Stock Status Pill */}
                {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-rose-400" />
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    {displayMode === 'exact_quantity'
                      ? `Low Stock · ${currentStock} units left`
                      : 'Low Stock'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                    <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    {displayMode === 'exact_quantity'
                      ? `${currentStock} in stock (OKC Warehouse)`
                      : 'In Stock (OKC)'}
                  </span>
                )}
              </div>

              {/* Product Title & Active SKU */}
              <div>
                <h2 id="modal-product-title" className="text-2xl sm:text-3xl font-bold text-[#F7F7F5] tracking-tight">
                  {item.name}
                </h2>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  <span className="font-mono text-xs bg-[#15191F] text-[#B8BDC5] px-2.5 py-0.5 rounded font-bold border border-[#2A3038]">
                    SKU: {currentSku}
                  </span>
                  {item.upc && (
                    <span className="text-[11px] text-[#858C96] font-mono">
                      UPC: {item.upc}
                    </span>
                  )}
                </div>
              </div>

              {/* Pricing Display */}
              {hasPricingAccess && typeof currentRate === 'number' ? (
                <>
                  <div className="p-4 bg-[#15191F] rounded-2xl border border-[#2A3038] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-[#FF6B00] block">
                        Direct Wholesale Price
                      </span>
                      <span className="text-3xl font-black text-[#F7F7F5]">
                        ${currentRate.toFixed(2)}
                      </span>
                      <span className="text-xs text-[#858C96] font-medium ml-1">/ unit</span>
                    </div>

                    {item.retail_msrp && (
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-bold text-[#858C96] block">
                          Estimated Retail MSRP
                        </span>
                        <span className="text-sm font-semibold text-[#858C96] line-through">
                          ${item.retail_msrp.toFixed(2)}
                        </span>
                        <span className="text-[11px] text-[#FF6B00] font-bold block">
                          ~{Math.round(((item.retail_msrp - currentRate) / item.retail_msrp) * 100)}% Profit Margin
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Bulk Pricing Tier Table */}
                  {item.bulk_pricing && item.bulk_pricing.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-[#858C96] mb-2">
                        Tiered Wholesale Pricing
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                        {item.bulk_pricing.map((tier, idx) => (
                          <div
                            key={idx}
                            className="bg-[#0B0D10] p-2.5 rounded-xl border border-[#2A3038] text-center"
                          >
                            <span className="text-[10px] text-[#858C96] block font-semibold">
                              {tier.label}
                            </span>
                            <span className="text-sm font-black text-[#F7F7F5]">
                              ${tier.pricePerUnit.toFixed(2)}
                            </span>
                            <span className="text-[9px] text-[#FF6B00] block font-bold">
                              ea
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="p-5 bg-[#15191F] rounded-2xl border border-[#2A3038] text-[#F7F7F5]">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B00]/10 flex items-center justify-center text-[#FF6B00]">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#F7F7F5]">Login to View Wholesale Pricing</h4>
                      <span className="text-[11px] text-[#858C96]">Restricted to verified wholesale retail accounts</span>
                    </div>
                  </div>
                  <p className="text-xs text-[#B8BDC5] leading-relaxed mt-2">
                    Case quantity tiers, profit margin calculators, and online ordering require an approved Wholesale of Oklahoma retail partner account.
                  </p>
                  <div className="grid grid-cols-2 gap-2 mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-login-modal'));
                      }}
                      className="py-2.5 px-3 bg-[#1B2027] hover:bg-[#2A3038] text-[#F7F7F5] font-bold text-xs rounded-xl border border-[#353C46] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <LogIn className="w-3.5 h-3.5 text-[#FF6B00]" />
                      Login to View Pricing
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        window.dispatchEvent(new CustomEvent('open-wholesale-application'));
                      }}
                      className="py-2.5 px-3 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Apply for Account
                    </button>
                  </div>
                </div>
              )}

              {/* Variants Selector (Flavors / Options) */}
              {item.variants && item.variants.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#F7F7F5]">
                      Select Flavor / Variant:
                    </span>
                    {selectedVariant && (
                      <span className="text-xs text-[#FF6B00] font-semibold">
                        {selectedVariant.variant_name} ·{' '}
                        {selectedVariant.stock_status === 'out_of_stock'
                          ? 'Out of Stock'
                          : displayMode === 'exact_quantity'
                          ? `${selectedVariant.available_stock} in stock`
                          : 'In Stock'}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-[#15191F] rounded-xl border border-[#2A3038]">
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
                              ? 'bg-[#FF6B00] text-white shadow-sm'
                              : isVarOOS
                              ? 'bg-[#0B0D10] text-[#858C96]/60 line-through'
                              : 'bg-[#0B0D10] text-[#B8BDC5] border border-[#2A3038] hover:border-[#FF6B00] hover:text-[#F7F7F5]'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              isVarOOS ? 'bg-rose-400' : 'bg-emerald-400'
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
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#858C96] mb-2">
                    Specifications
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-[#15191F] p-3 rounded-xl border border-[#2A3038]">
                    {item.specs.puffs && (
                      <div>
                        <span className="text-[#858C96] block text-[10px]">Estimated Puffs</span>
                        <span className="font-bold text-[#F7F7F5]">{item.specs.puffs}</span>
                      </div>
                    )}
                    {item.specs.nicotine && (
                      <div>
                        <span className="text-[#858C96] block text-[10px]">Nicotine Strength</span>
                        <span className="font-bold text-[#F7F7F5]">{item.specs.nicotine}</span>
                      </div>
                    )}
                    {item.specs.case_pack && (
                      <div>
                        <span className="text-[#858C96] block text-[10px]">Case Packaging</span>
                        <span className="font-bold text-[#F7F7F5]">{item.specs.case_pack}</span>
                      </div>
                    )}
                    {item.specs.origin && (
                      <div>
                        <span className="text-[#858C96] block text-[10px]">Distribution Origin</span>
                        <span className="font-bold text-[#F7F7F5]">{item.specs.origin}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions: Quantity Selector, Add to Cart & Dispatch CTA */}
            <div className="pt-4 border-t border-[#2A3038] space-y-3">
              {hasPricingAccess && typeof currentRate === 'number' ? (
                <div className="flex items-center gap-3">
                  {/* Stepper */}
                  <div
                    className={`flex items-center gap-2 bg-[#15191F] border border-[#2A3038] rounded-full px-3 py-2 ${
                      isOutOfStock ? 'opacity-40 pointer-events-none' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      disabled={qty <= 1 || isOutOfStock}
                      className="w-7 h-7 rounded-full bg-[#1B2027] text-[#F7F7F5] font-bold text-sm flex items-center justify-center hover:bg-[#2A3038] disabled:opacity-30 transition-colors cursor-pointer border border-[#2A3038]"
                    >
                      −
                    </button>
                    <span className="text-sm font-bold text-[#F7F7F5] px-2 min-w-[2.5rem] text-center">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQty((q) => Math.min(100, q + 1))}
                      disabled={qty >= 100 || isOutOfStock}
                      className="w-7 h-7 rounded-full bg-[#1B2027] text-[#F7F7F5] font-bold text-sm flex items-center justify-center hover:bg-[#2A3038] disabled:opacity-30 transition-colors cursor-pointer border border-[#2A3038]"
                    >
                      +
                    </button>
                  </div>

                  {/* Add to Cart Button */}
                  {isOutOfStock ? (
                    <button
                      type="button"
                      disabled
                      className="flex-1 py-3 bg-[#15191F] text-[#858C96] text-sm font-bold rounded-full border border-[#2A3038] flex items-center justify-center gap-2 cursor-not-allowed"
                    >
                      <AlertCircle className="w-4 h-4 text-[#858C96]" />
                      Currently Out of Stock
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddToCart}
                      className={`flex-1 py-3 text-white text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md ${
                        added
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-[#FF6B00] hover:bg-[#E85F00]'
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
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-login-modal'));
                    }}
                    className="w-full sm:flex-1 py-3.5 bg-[#15191F] hover:bg-[#2A3038] text-[#F7F7F5] border border-[#2A3038] text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <LogIn className="w-4 h-4 text-[#FF6B00]" />
                    Login to View Wholesale Pricing
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      window.dispatchEvent(new CustomEvent('open-wholesale-application'));
                    }}
                    className="w-full sm:flex-1 py-3.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-sm font-bold rounded-full transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <UserCheck className="w-4 h-4" />
                    Apply for Wholesale Account
                  </button>
                </div>
              )}

              {/* Order Form Shortcut & Dispatch Phone */}
              <div className="flex items-center justify-between text-xs text-[#858C96] pt-1">
                <button
                  type="button"
                  onClick={handleScrollToOrder}
                  className="text-[#FF6B00] font-bold hover:underline cursor-pointer"
                >
                  Need pallet pricing? Submit custom batch request →
                </button>

                <a
                  href="tel:4057682975"
                  className="font-bold text-[#F7F7F5] hover:text-[#FF6B00] flex items-center gap-1"
                >
                  <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
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
