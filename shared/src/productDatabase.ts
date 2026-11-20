// ─────────────────────────────────────────────────────────────────────────────
// productDatabase.ts
// Comprehensive Wholesale Catalog for Wholesale of Oklahoma
// Categorized Best Sellers: Disposables, Vape Mods, Pods, Coils, Batteries,
// Vape Juices, Pipes & Glass, THCA/CBD/Delta, Kratom, Novelties, Accessories.
// ─────────────────────────────────────────────────────────────────────────────

export interface BulkPricingTier {
  minQty: number;
  pricePerUnit: number;
  label: string;
}

export type ProductCategory =
  | 'Disposable Vapes'
  | 'Vape Mods & Kits'
  | 'Vape Juice'
  | 'Pipes & Glass'
  | 'THCA, CBD & Delta'
  | 'Kratom'
  | 'Novelties'
  | 'Accessories';

export interface WholesaleProduct {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: ProductCategory;
  subcategory?: 'Devices Kit' | 'Pod' | 'Battery' | 'Coils' | 'Glass' | 'Flower' | 'Edibles' | 'Extracts' | 'Papers' | 'General';
  puffs?: string;
  nicotine?: string;
  size?: string;
  badge?: string;
  features: string[];
  flavours: string[];
  popular: boolean;
  pricePerUnit: number;
  basePriceRange: string;
  inStock: boolean;
  minOrderQty: number;
  bulkPricing: BulkPricingTier[];
  imageUrl?: string;
}

// ─── Main Product Catalog (Best Sellers Across All Core Categories) ──────────

export const PRODUCTS: WholesaleProduct[] = [
  // ───────────────────────────────────────────────────────────────────────────
  // 1. DISPOSABLE VAPES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'geekbar-15k',
    sku: 'GB-PULSE-15K',
    name: 'Geekbar Pulse 15k',
    brand: 'Geekbar',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '🔥 #1 Best Seller',
    puffs: '15,000 Puffs',
    nicotine: '5%',
    features: ['Dual Mesh Coil', 'Full Screen Display', 'Pulse Mode Boost', 'Top Wholesale Turnover'],
    flavours: ['Fucking Fab', 'Blow Pop', 'Sour Apple Blow Pop', 'Watermelon Ice', 'Strawberry Banana', 'Miami Mint', 'Blue Razz Ice'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'geekbar-25k',
    sku: 'GB-PULSE-X-25K',
    name: 'Geekbar Pulse X 25k',
    brand: 'Geekbar',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '⚡ High Demand',
    puffs: '25,000 Puffs',
    nicotine: '5%',
    features: ["World's 1st 3D Curved Screen", 'Advanced Dual Core', 'Fast Charge Capable', 'Dispensary Top Pick'],
    flavours: ['Sour Mango Pineapple', 'Watermelon Ice', 'Sour Apple Ice', 'Strawberry B Pop', 'Miami Mint', 'Blue Rancher', 'Lime Berry Orange'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'geekbar-60k',
    sku: 'GB-PULSE-ULTRA-60K',
    name: 'Geekbar Pulse Ultra 60k',
    brand: 'Geekbar',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '💨 Max Capacity',
    puffs: '60,000 Puffs',
    nicotine: '5%',
    features: ['Extended High-Capacity Tank', 'Triple Mesh Technology', 'Interactive Fluid Indicator', 'Max Hand Feel'],
    flavours: ['Blue Straws', 'Triple Berry', 'Cool Mint', 'Miami Mint', 'Strawberry Watermelon'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'raz-25k',
    sku: 'RAZ-LTX-25K',
    name: 'Raz Ltx 25k',
    brand: 'Raz',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '🔥 Top Mover',
    puffs: '25,000 Puffs',
    nicotine: '5%',
    features: ['Genuine Leather Texture Grip', 'HD Animation Screen', 'Adjustable Dual Airflow', 'Wholesale Classic'],
    flavours: ['Night Crawler', 'Mango Ice', 'Georgia Peach', 'Blueberry Watermelon', 'Blue Razz Gush', 'Cherry Lemon'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'vozol-50k',
    sku: 'VOZOL-50K',
    name: 'Vozol 50K Kit & Pod',
    brand: 'Vozol',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '⚡ Top Rated',
    puffs: '50,000 Puffs',
    nicotine: '5%',
    features: ['50k High-Capacity Pack', 'Smart Air Control', 'Rapid Charge Capability', 'Dual Core Preservation'],
    flavours: ['Watermelon Razz Rancher', 'Cool Mint', 'Hawaiian Pineapple Paradise', 'Miami Mint', 'Blue Razz Ice'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'foger-30k',
    sku: 'FOGER-30K',
    name: 'Foger 30K Kit & Pod',
    brand: 'Foger',
    category: 'Disposable Vapes',
    subcategory: 'Devices Kit',
    badge: '💨 Fast Restock',
    puffs: '30,000 Puffs',
    nicotine: '5%',
    features: ['Dynamic Pod Kit Setup', 'Interchangeable Cartridges', 'Eco-Boost Core Technology', 'Premium Vapor Density'],
    flavours: ['Strawberry Watermelon', 'Blue Razz Ice', 'Gummy Bear', 'Gum Mint', 'Sour Apple Ice'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 2. VAPE MODS & KITS (Device Kits, Pods, Batteries, Coils)
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'geekbar-kit',
    sku: 'GB-KIT-DEVICE',
    name: 'Geekbar Pulse Starter Kit',
    brand: 'Geekbar',
    category: 'Vape Mods & Kits',
    subcategory: 'Devices Kit',
    badge: '⭐ Device Kit',
    puffs: 'Rechargeable Battery + Pod Included',
    nicotine: '5%',
    features: ['Rechargeable Base Device', 'Includes 1 Pre-filled Pod', 'Type-C Quick Charging', 'Vape Shop Essential'],
    flavours: ['Black Cherry', 'Mexico Mango', 'Blue Razz Ice', 'Fcuking FAB'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'geekbar-pod',
    sku: 'GB-POD-PREFILL',
    name: 'Geekbar Replacement Pods',
    brand: 'Geekbar',
    category: 'Vape Mods & Kits',
    subcategory: 'Pod',
    badge: '🔄 Pre-filled Pod',
    puffs: '12,000 Puffs per pod',
    nicotine: '5%',
    features: ['Magnetic Snap Connection', 'Leak-Resistant Design', 'High Volume Seller', 'Master Case Restock'],
    flavours: ['Watermelon Ice', 'Blue Razz Ice', 'Miami Mint', 'Sour Apple', 'Strawberry Kiwi'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'raz-pod',
    sku: 'RAZ-POD-SYSTEM',
    name: 'Raz Replacement Pods',
    brand: 'Raz',
    category: 'Vape Mods & Kits',
    subcategory: 'Pod',
    badge: '🔄 Replacement Pod',
    puffs: '15,000 Puffs per pod',
    nicotine: '5%',
    features: ['Mesh Coil Preservation', 'Magnetic Fit Pods', 'Optimized Vapor Density', 'Popular Restock Item'],
    flavours: ['Graham Twist', 'Tiffany', 'Night Crawler', 'Polar Ice', 'Strawberry Shortcake'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'vaporesso-xros-4',
    sku: 'VAP-XROS-4-KIT',
    name: 'Vaporesso XROS 4 Pod Kit',
    brand: 'Vaporesso',
    category: 'Vape Mods & Kits',
    subcategory: 'Devices Kit',
    badge: '🔥 #1 Pod System',
    size: '1000mAh Battery Device',
    features: ['Corex 2.0 Aroma Reproduction', '3 Output Modes', 'All XROS Pod Compatible', 'Top Rated Hardware in OKC'],
    flavours: ['Black', 'Silver', 'Blue', 'Sunset Neon', 'Champagne Gold'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'vaporesso-xros-pods',
    sku: 'VAP-XROS-POD-4PK',
    name: 'Vaporesso XROS Series Pods (4-Pack)',
    brand: 'Vaporesso',
    category: 'Vape Mods & Kits',
    subcategory: 'Pod',
    badge: '⚡ Top Moving Pod',
    size: '4 Pods per Box (0.4Ω, 0.6Ω, 0.8Ω)',
    features: ['SSS Leak-Resistant Tech', 'Clamshell Top Fill', 'Corex Heating Tech', 'Essential Wholesale Restock'],
    flavours: ['0.4 Ohm Mesh', '0.6 Ohm Mesh', '0.8 Ohm Mesh', '1.0 Ohm Mesh'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 packs' }, { minQty: 25, pricePerUnit: 0, label: '25+ packs' }],
  },
  {
    id: 'smok-nord-coils',
    sku: 'SMOK-RPM-COIL-5PK',
    name: 'SMOK RPM 3 Replacement Coils (5-Pack)',
    brand: 'SMOK',
    category: 'Vape Mods & Kits',
    subcategory: 'Coils',
    badge: '⚙️ Replacement Coils',
    size: '5 Coils per Pack (0.15Ω / 0.23Ω)',
    features: ['Mesh Heating Element', 'Press-Fit Coil Installation', 'Direct-to-Lung Dense Vapor', 'Dispensary & Vape Shelf Staple'],
    flavours: ['0.15 Ohm Meshed', '0.23 Ohm Meshed'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 packs' }, { minQty: 25, pricePerUnit: 0, label: '25+ packs' }],
  },
  {
    id: 'yocan-kodo-pro',
    sku: 'YOC-KODO-PRO-510',
    name: 'Yocan Kodo Pro 510 Battery',
    brand: 'Yocan',
    category: 'Vape Mods & Kits',
    subcategory: 'Battery',
    badge: '🔋 Top 510 Battery',
    size: '400mAh OLED 510 Thread',
    features: ['OLED Display Screen', '10s Preheat Function', 'Variable Voltage (1.8V-4.2V)', 'Puff Counter & Type-C Charging'],
    flavours: ['Black', 'White', 'Blue', 'Red', 'Yellow', 'Purple'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 3. VAPE JUICE
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'juice-head-100ml',
    sku: 'JH-100ML-ELIQ',
    name: 'Juice Head E-Liquid 100ml',
    brand: 'Juice Head',
    category: 'Vape Juice',
    badge: '🔥 #1 Juice Brand',
    size: '100ml Chubby Gorilla Bottle',
    nicotine: '0mg / 3mg / 6mg',
    features: ['Top-Ranked Wholesale Brand', '70VG/30PG Sub-Ohm Formula', 'Fresh Fruit Blend', 'Tamper Evident Cap'],
    flavours: ['Peach Pear', 'Blueberry Lemon', 'Watermelon Lime', 'Guava Peach', 'Strawberry Kiwi', 'Pineapple Grapefruit', 'Freeze editions'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },
  {
    id: 'juice-head-salts-30ml',
    sku: 'JH-SALT-30ML',
    name: 'Juice Head Salts 30ml',
    brand: 'Juice Head',
    category: 'Vape Juice',
    badge: '⚡ Top Salt Nic',
    size: '30ml Salt Nic Bottle',
    nicotine: '25mg / 50mg Salt Nic',
    features: ['High-Demand Salt Nicotine', '50VG/50PG Pod System Formula', 'Intense Smooth Flavor', 'Fast Turnaround Restock'],
    flavours: ['Peach Pear Freeze', 'Watermelon Lime', 'Blueberry Lemon', 'Guava Peach Freeze', 'Mango Strawberry'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },
  {
    id: 'coastal-clouds-60ml',
    sku: 'CC-60ML-ELIQ',
    name: 'Coastal Clouds E-Liquid 60ml',
    brand: 'Coastal Clouds',
    category: 'Vape Juice',
    badge: '⭐ Premium Award Winner',
    size: '60ml Premium Bottle',
    nicotine: '0mg / 3mg / 6mg',
    features: ['Award-Winning Flavors', 'Made in USA Premium Quality', '70VG/30PG Blend', 'High Repeat Customer Loyalty'],
    flavours: ['Apple Peach Strawberry', 'Blueberry Banana', 'Blood Orange Mango', 'Lemon Meringue Pie', 'Melon Berries', 'Tres Leches'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },
  {
    id: 'coastal-clouds-salts-30ml',
    sku: 'CC-SALT-30ML',
    name: 'Coastal Clouds Salt Nic 30ml',
    brand: 'Coastal Clouds',
    category: 'Vape Juice',
    badge: '⚡ Clean Sweetener',
    size: '30ml Salt Nic Bottle',
    nicotine: '35mg / 50mg Salt Nic',
    features: ['Optimized for Refillable Pods', 'Clean Coil-Friendly Sweetener', 'Vibrant Flavor Profiles', 'Top Seller in OKC Metro'],
    flavours: ['Apple Watermelon', 'Mint', 'Blueberry Limeade', 'Mango', 'Chilled Apple Pear'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },
  {
    id: 'sadboy-100ml',
    sku: 'SB-100ML-ELIQ',
    name: 'Sadboy E-Liquid 100ml',
    brand: 'Sadboy',
    category: 'Vape Juice',
    badge: '🍪 Cookie Legend',
    size: '100ml Bottle',
    nicotine: '0mg / 3mg / 6mg',
    features: ['Famous Cookie & Dessert Line', 'Rich Dense Cloud Production', 'Top Wholesale Restock', 'Certified Wholesale Batch'],
    flavours: ['Butter Cookie', 'Blueberry Jam Cookie', 'Strawberry Jam Cookie', 'Key Lime Cookie', 'Rainbow Blood'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },
  {
    id: 'twist-120ml',
    sku: 'TWIST-120ML-ELIQ',
    name: 'Twist E-Liquids (2x60ml Pack)',
    brand: 'Twist',
    category: 'Vape Juice',
    badge: '🍋 Iconic Value 2-Pack',
    size: '120ml Total (2 x 60ml Bottles)',
    nicotine: '0mg / 3mg / 6mg',
    features: ['Value 2-Pack Box', 'Legendary Lemonade Line', 'Iconic Vape Brand', 'Best-in-Class Margin'],
    flavours: ['Pink No. 1 (Pink Punch)', 'Crimson No. 1 (Strawberry Crush)', 'Green No. 1 (Honeydew Chew)', 'Space No. 1'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 packs' }, { minQty: 25, pricePerUnit: 0, label: '25+ packs' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 4. PIPES & GLASS
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'glass-beaker-10in',
    sku: 'GLS-BEAKER-10',
    name: '10" Heavy Borosilicate Beaker Water Pipe',
    brand: 'OKC Glassworks',
    category: 'Pipes & Glass',
    subcategory: 'Glass',
    badge: '🔥 #1 Wholesale Glass',
    size: '10 Inch / 7mm Thick Glass',
    features: ['Premium 7mm Thick Wall', 'Removable Downstem & 14mm Bowl', 'Built-in 3-Pinch Ice Catcher', 'Classic High Margin Retailer'],
    flavours: ['Clear', 'Teal Accent', 'Milky Pink', 'Amber Accents'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'glass-spoon-pipe-4in',
    sku: 'GLS-SPOON-4IN-DZ',
    name: '4" Heavy Frit Glass Spoon Hand Pipe (Dozen Pack)',
    brand: 'OKC Glassworks',
    category: 'Pipes & Glass',
    subcategory: 'Glass',
    badge: '⚡ Impulse Buy Favorite',
    size: '12 Assorted Hand Pipes per Box',
    features: ['Double Blown Thick Glass', 'Deep Bowl Hole with Left Side Carb', 'Vibrant Swirl Color Frit', 'Counter Display Ready'],
    flavours: ['Assorted Swirl Multi-Colors', 'Rasta Colors', 'Galaxy Blue/Purple'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 packs' }, { minQty: 25, pricePerUnit: 0, label: '25+ packs' }],
  },
  {
    id: 'eyce-silicone-beaker',
    sku: 'EYCE-SILICONE-BK',
    name: 'Unbreakable Silicone Beaker Pipe with Stash',
    brand: 'Eyce',
    category: 'Pipes & Glass',
    subcategory: 'Glass',
    badge: '🛡️ Unbreakable',
    size: '12 Inch Platinum Cured Silicone',
    features: ['Platinum Cured Silicone', 'Hidden Stash Compartment in Base', 'Includes Borosilicate Glass Bowl', 'Travel Friendly'],
    flavours: ['Black/Green Swirl', 'Tie Dye', 'Smoke Grey', 'Rasta'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 5. THCA, CBD & DELTA
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'thca-diamond-prerolls',
    sku: 'THCA-DIAMOND-PR',
    name: 'THCA Diamond Infused Pre-Rolls (5-Pack Jar)',
    brand: 'Green State Botanicals',
    category: 'THCA, CBD & Delta',
    subcategory: 'Flower',
    badge: '🔥 Top Dispensary Seller',
    size: '5 Pre-Rolls x 0.75g (3.75g Total)',
    features: ['100% Indoor Exotic Flower', 'Infused with 99% Pure THCA Diamonds', 'Slow-Burning Terpene Infusion', 'Lab Tested COA Included'],
    flavours: ['Gelato 41 (Hybrid)', 'Sour Diesel (Sativa)', 'Granddaddy Purple (Indica)', 'Runtz (Hybrid)'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 jars' }, { minQty: 25, pricePerUnit: 0, label: '25+ jars' }],
  },
  {
    id: 'delta-live-resin-disposable-2g',
    sku: 'DLT-LIVERES-2G',
    name: 'Delta Live Resin 2g Rechargeable Disposable',
    brand: 'Green State Botanicals',
    category: 'THCA, CBD & Delta',
    subcategory: 'Extracts',
    badge: '⚡ High Potency',
    size: '2 Gram Live Resin Terpene Blend',
    features: ['Pre-heat Button Mechanism', 'Live Resin Fresh Frozen Terps', 'Type-C Fast Rechargeable', 'Child-Resistant Packaging'],
    flavours: ['Blueberry OG', 'Pineapple Express', 'Watermelon Zkittlez', 'Super Lemon Haze'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'cbd-relax-gummies-1000mg',
    sku: 'CBD-GUMMY-1000MG',
    name: 'Full Spectrum CBD Sleep & Relax Gummies (1000mg)',
    brand: 'Pure Relief Labs',
    category: 'THCA, CBD & Delta',
    subcategory: 'Edibles',
    badge: '🌿 Wellness Essential',
    size: '30 Gummies per Jar (33mg/gummy)',
    features: ['Organic Cane Sugar Formulation', 'Infused with Melatonin & L-Theanine', 'Third-Party Batch Certified', 'Counter Display Ready'],
    flavours: ['Mixed Berry Punch', 'Sour Watermelon', 'Peach Mango'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 jars' }, { minQty: 25, pricePerUnit: 0, label: '25+ jars' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 6. KRATOM
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'opms-gold-liquid-extract',
    sku: 'OPMS-GOLD-SHOT-45PK',
    name: 'O.P.M.S. Gold Liquid Kratom Extract Shot (Case / Single)',
    brand: 'O.P.M.S.',
    category: 'Kratom',
    subcategory: 'Extracts',
    badge: '🔥 #1 Selling Kratom in USA',
    size: '8.8ml Pure Alkaloid Liquid Shot',
    features: ['Cold Water Extraction Process', 'High Alkaloid Concentration', 'Fast Register Turnover', 'Authentic QR Security Seals'],
    flavours: ['Full Spectrum Gold Extract'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 shots' }, { minQty: 25, pricePerUnit: 0, label: '25+ shots' }],
  },
  {
    id: 'opms-black-liquid-extract',
    sku: 'OPMS-BLACK-SHOT',
    name: 'O.P.M.S. Black Liquid Kratom Extract Shot',
    brand: 'O.P.M.S.',
    category: 'Kratom',
    subcategory: 'Extracts',
    badge: '⚡ Max Strength',
    size: '8.8ml Ultra-Concentrated Shot',
    features: ['Higher 7-Hydroxymitragynine Blend', 'Industry Standard Extract', 'High Repeat Customer Demand', 'Display Box Pack'],
    flavours: ['Black Ultra-Strength Blend'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 shots' }, { minQty: 25, pricePerUnit: 0, label: '25+ shots' }],
  },
  {
    id: 'kratom-capsules-maeng-da',
    sku: 'KRT-CAPS-MD-300',
    name: 'Green Maeng Da Pure Kratom Capsules (300ct Bottle)',
    brand: 'Remarkable Herbs',
    category: 'Kratom',
    subcategory: 'Extracts',
    badge: '🌿 Daily Restock',
    size: '300 Gelatin Capsules per Bottle',
    features: ['100% Pure Mitragyna Speciosa', 'Sterilized & Lab Tested', 'Premium Finely Milled Leaf', 'Dispensary Shelf Staple'],
    flavours: ['Green Maeng Da (Focus & Energy)', 'Red Bali (Calm & Pain)', 'White Borneo (Morning Boost)'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 bottles' }, { minQty: 25, pricePerUnit: 0, label: '25+ bottles' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 7. NOVELTIES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'precision-digital-scale-001g',
    sku: 'NOV-SCALE-001G',
    name: 'Precision Digital Pocket Scale (0.01g Accuracy)',
    brand: 'Blade Scales',
    category: 'Novelties',
    badge: '⚖️ Essential Tool',
    size: '500g Capacity x 0.01g Accuracy',
    features: ['Backlit LCD Display', 'Tare Full Capacity Feature', 'Batteries Included', 'Protective Flip-Down Cover'],
    flavours: ['Black Matte', 'Stainless Silver'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'aircraft-aluminum-grinder-4pc',
    sku: 'NOV-GRINDER-63MM',
    name: '63mm 4-Piece Aircraft Aluminum Herb Grinder',
    brand: 'Santa Cruz Style',
    category: 'Novelties',
    badge: '⚙️ High Turnover',
    size: '63mm Diameter (2.5 Inch) 4-Piece',
    features: ['Razor-Sharp Diamond Curved Teeth', 'Micron Stainless Steel Pollen Screen', 'Includes Scraping Tool', 'Neodymium Magnetic Lid'],
    flavours: ['Gunmetal Grey', 'Matte Black', 'Rose Gold', 'Rasta Gradient', 'Emerald Green'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
  {
    id: 'scorch-torch-triple-jet',
    sku: 'NOV-TORCH-TRIPLE',
    name: 'Scorch Torch Heavy Duty Triple Jet Torch Lighter',
    brand: 'Scorch Torch',
    category: 'Novelties',
    badge: '🔥 Triple Flame',
    size: 'Refillable Butane Triple Flame Torch',
    features: ['Automatic Slip-Proof Ignition', 'Adjustable Flame Valve', 'Built-in Cigar Punch Tool', 'Display of 12 Assorted Colors'],
    flavours: ['Matte Black', 'Metallic Gunmetal', 'Carbon Fiber Blue', 'Gun Grey'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },

  // ───────────────────────────────────────────────────────────────────────────
  // 8. ACCESSORIES
  // ───────────────────────────────────────────────────────────────────────────
  {
    id: 'raw-classic-king-size-box',
    sku: 'ACC-RAW-KS-BOX24',
    name: 'RAW Classic King Size Slim Rolling Papers (Box of 24)',
    brand: 'RAW',
    category: 'Accessories',
    subcategory: 'Papers',
    badge: '👑 World Famous Paper',
    size: '24 Booklets per Display Box (32 Leaves/pack)',
    features: ['Unrefined Natural Plant Fibers', 'Criss-Cross Watermark Anti-Run Tech', 'Acacia Gumline', 'Every Wholesale Must-Have'],
    flavours: ['Natural Unrefined Brown'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 boxes' }, { minQty: 25, pricePerUnit: 0, label: '25+ boxes' }],
  },
  {
    id: 'king-palm-cones-display',
    sku: 'ACC-KP-SLIM-20PK',
    name: 'King Palm Natural Cordia Leaf Pre-Rolled Cones (20-Pack Box)',
    brand: 'King Palm',
    category: 'Accessories',
    subcategory: 'Papers',
    badge: '🌴 100% Tobacco-Free',
    size: '20 Resealable Foil Pouches (2 Cones per Pouch)',
    features: ['Handpicked Cordia Tree Leaves', 'Natural Corn Husk Filter', 'Includes Bamboo Packing Stick', 'Smooth Cool Flavor'],
    flavours: ['Natural Leaf', 'Berry Terps', 'Watermelon Wave', 'Magic Mint'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 boxes' }, { minQty: 25, pricePerUnit: 0, label: '25+ boxes' }],
  },
  {
    id: 'newport-zero-butane-12can',
    sku: 'ACC-BUTANE-NPZ-12',
    name: 'Newport Zero 300ml Extra Refined Butane Fuel (Case of 12)',
    brand: 'Newport Zero',
    category: 'Accessories',
    subcategory: 'General',
    badge: '⚡ Pure Refined Gas',
    size: '12 Cans x 300ml Master Box',
    features: ['Near Zero Impurity Rating', 'Multiple Universal Adaptor Caps', 'High Pressure Torch Safe', 'Dispensary Essential'],
    flavours: ['Zero Impurity Refined Butane'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 cases' }, { minQty: 25, pricePerUnit: 0, label: '25+ cases' }],
  },
  {
    id: 'cookies-510-battery-display',
    sku: 'ACC-COOKIES-510-BAT',
    name: 'Cookies 510 Thread Adjustable Voltage Battery (Display of 20)',
    brand: 'Cookies',
    category: 'Accessories',
    subcategory: 'Battery',
    badge: '🔋 Cult Brand Favorite',
    size: '20 Batteries per Counter Display Box',
    features: ['Variable Voltage Bottom Dial (2.0V-4.0V)', 'Preheat Function', 'Includes USB Charger Cable', 'Iconic Cookies Brand Graphics'],
    flavours: ['Cookies Signature Blue', 'Matte White', 'Red Edition', 'Matte Black'],
    popular: true,
    pricePerUnit: 0,
    basePriceRange: 'Call for Price',
    inStock: true,
    minOrderQty: 1,
    bulkPricing: [{ minQty: 1, pricePerUnit: 0, label: '1-20 units' }, { minQty: 25, pricePerUnit: 0, label: '25+ units' }],
  },
];

// ─── Helper Functions ─────────────────────────────────────────────────────────

export const CATEGORIES_LIST: ProductCategory[] = [
  'Disposable Vapes',
  'Vape Mods & Kits',
  'Vape Juice',
  'Pipes & Glass',
  'THCA, CBD & Delta',
  'Kratom',
  'Novelties',
  'Accessories',
];

export function searchProducts(query: string): WholesaleProduct[] {
  const q = query.toLowerCase().trim();
  if (!q) return PRODUCTS;

  return PRODUCTS.filter((p) => {
    const haystack = [
      p.name,
      p.brand,
      p.sku,
      p.category,
      p.subcategory || '',
      p.size || '',
      ...p.flavours,
      ...p.features,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getProduct(idOrSku: string): WholesaleProduct | undefined {
  const key = idOrSku.toLowerCase().trim();
  return PRODUCTS.find(
    (p) => p.id.toLowerCase() === key || p.sku.toLowerCase() === key
  );
}

export function getAllCategories(): ProductCategory[] {
  return CATEGORIES_LIST;
}

export function getWholesalePrice(
  productId: string,
  quantity: number
): { pricePerUnit: number; totalPrice: number; tierLabel: string } | null {
  const product = getProduct(productId);
  if (!product) return null;

  const applicableTiers = product.bulkPricing.filter(
    (tier) => quantity >= tier.minQty
  );
  const bestTier =
    applicableTiers.length > 0
      ? applicableTiers[applicableTiers.length - 1]
      : product.bulkPricing[0];

  return {
    pricePerUnit: bestTier.pricePerUnit,
    totalPrice: Math.round(bestTier.pricePerUnit * quantity * 100) / 100,
    tierLabel: bestTier.label,
  };
}

export function getProductsByCategory(category: string): WholesaleProduct[] {
  return PRODUCTS.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );
}
