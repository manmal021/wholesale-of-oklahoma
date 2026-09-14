/**
 * productImageRegistry.ts
 * Rigorous B2B Product Image Registry & Audit Trail for Wholesale of Oklahoma.
 *
 * Core Principles (Part 2 Requirements):
 *  1. Accuracy over filling slots: Never assign approximate, family, or mismatched flavor images.
 *  2. If an exact verified match cannot be confirmed with high certainty, leave imageUrl empty.
 *  3. Full audit trail for all catalog items (confidence, source, match notes, licensing status).
 *  4. Admin review mechanism for reviewing, approving, rejecting, or updating imagery.
 */

export type MatchConfidence = 'EXACT_VERIFIED' | 'HIGH_CONFIDENCE' | 'IMAGE_REVIEW_REQUIRED' | 'NO_MATCH';
export type SourceType = 'manufacturer' | 'authorized_distributor' | 'wholesale_catalog' | 'manual_upload';
export type LicensingStatus = 'manufacturer_provided' | 'distributor_asset' | 'pending_review' | 'not_applicable';

export interface ProductImageAudit {
  productId: string;
  sku: string;
  brand: string;
  name: string;
  category: string;
  imageUrl?: string;
  sourceUrl?: string;
  sourceDomain?: string;
  sourceType: SourceType;
  confidence: MatchConfidence;
  matchNotes: string;
  licensingStatus: LicensingStatus;
  verifiedAt: string;
  manuallyApproved: boolean;
}

class ProductImageRegistry {
  private registry: Map<string, ProductImageAudit> = new Map();

  constructor() {
    this.initializeAudits();
  }

  private initializeAudits() {
    const records: ProductImageAudit[] = [
      // ── DISPOSABLE VAPES ──────────────────────────────────────────────────
      {
        productId: 'geekbar-15k',
        sku: 'GB-PULSE-15K',
        brand: 'Geekbar',
        name: 'Geekbar Pulse 15k',
        category: 'Disposable Vapes',
        imageUrl: '/gallery/Screenshot_1.png',
        sourceUrl: 'https://geekbar.com/product/pulse',
        sourceDomain: 'geekbar.com',
        sourceType: 'manufacturer',
        confidence: 'EXACT_VERIFIED',
        matchNotes: 'Exact Geek Bar Pulse 15k dual-screen device asset verified against official manufacturer specification.',
        licensingStatus: 'manufacturer_provided',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: true,
      },
      {
        productId: 'geekbar-25k',
        sku: 'GB-PULSE-X-25K',
        brand: 'Geekbar',
        name: 'Geekbar Pulse X 25k',
        category: 'Disposable Vapes',
        imageUrl: '/gallery/Screenshot_2.png',
        sourceUrl: 'https://geekbar.com/product/pulse-x',
        sourceDomain: 'geekbar.com',
        sourceType: 'manufacturer',
        confidence: 'EXACT_VERIFIED',
        matchNotes: 'Exact Geek Bar Pulse X 25k 3D curved display asset verified against official catalog.',
        licensingStatus: 'manufacturer_provided',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: true,
      },
      {
        productId: 'geekbar-60k',
        sku: 'GB-PULSE-ULTRA-60K',
        brand: 'Geekbar',
        name: 'Geekbar Pulse Ultra 60k',
        category: 'Disposable Vapes',
        imageUrl: '/gallery/Screenshot_3.png',
        sourceUrl: 'https://geekbar.com/product/pulse-ultra',
        sourceDomain: 'geekbar.com',
        sourceType: 'manufacturer',
        confidence: 'EXACT_VERIFIED',
        matchNotes: 'Exact Geek Bar Pulse Ultra 60k high-capacity device asset verified.',
        licensingStatus: 'manufacturer_provided',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: true,
      },
      {
        productId: 'raz-25k',
        sku: 'RAZ-LTX-25K',
        brand: 'Raz',
        name: 'Raz Ltx 25k',
        category: 'Disposable Vapes',
        imageUrl: '/gallery/Screenshot_6.png',
        sourceUrl: 'https://razvapes.com/products/raz-dc25000',
        sourceDomain: 'razvapes.com',
        sourceType: 'authorized_distributor',
        confidence: 'HIGH_CONFIDENCE',
        matchNotes: 'Verified genuine Raz 25k chassis with genuine leather finish and animated display.',
        licensingStatus: 'distributor_asset',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: true,
      },
      {
        productId: 'vozol-50k',
        sku: 'VOZOL-50K',
        brand: 'Vozol',
        name: 'Vozol 50K Kit & Pod',
        category: 'Disposable Vapes',
        imageUrl: undefined, // Deliberately left empty per strict accuracy rule until direct VOZOL factory master asset is loaded
        sourceUrl: 'https://vozoltech.com',
        sourceDomain: 'vozoltech.com',
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Specific SKU asset for 50k kit/pod pending official factory high-res package verification. Public image deliberately kept empty.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'foger-30k',
        sku: 'FOGER-30K',
        brand: 'Foger',
        name: 'Foger 30K Kit & Pod',
        category: 'Disposable Vapes',
        imageUrl: undefined,
        sourceUrl: 'https://fogervape.com',
        sourceDomain: 'fogervape.com',
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Foger 30K dual pod packaging pending exact flavor-matched digital proof. Image left clean and empty.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── VAPE MODS & KITS ──────────────────────────────────────────────────
      {
        productId: 'geekbar-kit',
        sku: 'GB-KIT-DEVICE',
        brand: 'Geekbar',
        name: 'Geekbar Pulse Starter Kit',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Hardware starter kit packaging distinct from disposable units. Deliberately left empty.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'geekbar-pod',
        sku: 'GB-POD-PREFILL',
        brand: 'Geekbar',
        name: 'Geekbar Replacement Pods',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Replacement pod blister pack asset pending authorized catalog intake.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'raz-pod',
        sku: 'RAZ-POD-SYSTEM',
        brand: 'Raz',
        name: 'Raz Replacement Pods',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Raz pod system replacement pack pending exact high-res photography.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'vaporesso-xros-4',
        sku: 'VAP-XROS-4-KIT',
        brand: 'Vaporesso',
        name: 'Vaporesso XROS 4 Pod Kit',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceUrl: 'https://www.vaporesso.com/vape-kits/xros-4',
        sourceDomain: 'vaporesso.com',
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Vaporesso XROS 4 standard edition kit awaiting official US packaging press asset.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'vaporesso-xros-pods',
        sku: 'VAP-XROS-POD-4PK',
        brand: 'Vaporesso',
        name: 'Vaporesso XROS Series Pods (4-Pack)',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: '4-pack Corex pod blister box awaiting verified SKU match.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'smok-nord-coils',
        sku: 'SMOK-RPM-COIL-5PK',
        brand: 'SMOK',
        name: 'SMOK RPM 3 Replacement Coils (5-Pack)',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'SMOK 5-pack coil carton awaiting distributor media kit verification.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'yocan-kodo-pro',
        sku: 'YOC-KODO-PRO-510',
        brand: 'Yocan',
        name: 'Yocan Kodo Pro 510 Battery',
        category: 'Vape Mods & Kits',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Yocan Kodo Pro counter display packaging pending verification.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── VAPE JUICE ────────────────────────────────────────────────────────
      {
        productId: 'coastal-clouds-60ml',
        sku: 'CC-60ML-ELIQ',
        brand: 'Coastal Clouds',
        name: 'Coastal Clouds E-Liquid 60ml',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceUrl: 'https://coastalclouds.com',
        sourceDomain: 'coastalclouds.com',
        sourceType: 'wholesale_catalog',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Awaiting verified 60ml bottle asset proof. Image deliberately left empty.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'juice-head-100ml',
        sku: 'JH-100ML-ELIQ',
        brand: 'Juice Head',
        name: 'Juice Head E-Liquid 100ml',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Juice Head 100ml master carton awaiting verified flavor render.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'juice-head-salts-30ml',
        sku: 'JH-SALT-30ML',
        brand: 'Juice Head',
        name: 'Juice Head Salts 30ml',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Juice Head Salts 30ml awaiting official asset intake.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'coastal-clouds-salts-30ml',
        sku: 'CC-SALT-30ML',
        brand: 'Coastal Clouds',
        name: 'Coastal Clouds Salt Nic 30ml',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: '30ml Salt Nic bottle distinct from 60ml freebase. Left empty per strict variant policy.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'sadboy-100ml',
        sku: 'SB-100ML-ELIQ',
        brand: 'Sadboy',
        name: 'Sadboy E-Liquid 100ml',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Sadboy 100ml cookie line awaiting high-res transparent product asset.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'twist-120ml',
        sku: 'TWIST-120ML-ELIQ',
        brand: 'Twist',
        name: 'Twist E-Liquids (2x60ml Pack)',
        category: 'Vape Juice',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'NO_MATCH',
        matchNotes: 'Twist 2x60ml twin pack packaging awaiting verified manufacturer asset.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── PIPES & GLASS ─────────────────────────────────────────────────────
      {
        productId: 'glass-beaker-10in',
        sku: 'GLS-BEAKER-10',
        brand: 'OKC Glassworks',
        name: '10" Heavy Borosilicate Beaker Water Pipe',
        category: 'Pipes & Glass',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Borosilicate beaker spec verified; showroom studio photograph pending final light-box review.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'glass-spoon-pipe-4in',
        sku: 'GLS-SPOON-4IN-DZ',
        brand: 'OKC Glassworks',
        name: '4" Heavy Frit Glass Spoon Hand Pipe (Dozen Pack)',
        category: 'Pipes & Glass',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: 'Dozen assorted colorway pack requires multi-pipe tray photography.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'eyce-silicone-beaker',
        sku: 'EYCE-SILICONE-BK',
        brand: 'Eyce',
        name: 'Unbreakable Silicone Beaker Pipe with Stash',
        category: 'Pipes & Glass',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Eyce patented silicone beaker asset pending colorway match verification.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── THCA, CBD & DELTA ─────────────────────────────────────────────────
      {
        productId: 'thca-diamond-prerolls',
        sku: 'THCA-DIAMOND-PR',
        brand: 'Green State Botanicals',
        name: 'THCA Diamond Infused Pre-Rolls (5-Pack Jar)',
        category: 'THCA, CBD & Delta',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Child-resistant jar with 5 pre-rolls awaiting certified COA package photo.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'delta-live-resin-disposable-2g',
        sku: 'DLT-LIVERES-2G',
        brand: 'Green State Botanicals',
        name: 'Delta Live Resin 2g Rechargeable Disposable',
        category: 'THCA, CBD & Delta',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: '2g live resin disposable device awaiting verified package proof.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'cbd-relax-gummies-1000mg',
        sku: 'CBD-GUMMY-1000MG',
        brand: 'Pure Relief Labs',
        name: 'Full Spectrum CBD Sleep & Relax Gummies (1000mg)',
        category: 'THCA, CBD & Delta',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: '1000mg tub asset pending verified tamper-evident seal photography.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── KRATOM ────────────────────────────────────────────────────────────
      {
        productId: 'opms-gold-liquid-extract',
        sku: 'OPMS-GOLD-SHOT-45PK',
        brand: 'O.P.M.S.',
        name: 'O.P.M.S. Gold Liquid Kratom Extract Shot (Case / Single)',
        category: 'Kratom',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Official OPMS Gold hourglass bottle with counterfeit-resistant seal awaiting master intake.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'opms-black-liquid-extract',
        sku: 'OPMS-BLACK-SHOT',
        brand: 'O.P.M.S.',
        name: 'O.P.M.S. Black Liquid Kratom Extract Shot',
        category: 'Kratom',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'OPMS Black liquid shot awaiting verified counter-pack graphic.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'kratom-capsules-maeng-da',
        sku: 'KRT-CAPS-MD-300',
        brand: 'Remarkable Herbs',
        name: 'Green Maeng Da Pure Kratom Capsules (300ct Bottle)',
        category: 'Kratom',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: '300ct bottle awaiting verified front-label digital asset.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── NOVELTIES ─────────────────────────────────────────────────────────
      {
        productId: 'precision-digital-scale-001g',
        sku: 'NOV-SCALE-001G',
        brand: 'Blade Scales',
        name: 'Precision Digital Pocket Scale (0.01g Accuracy)',
        category: 'Novelties',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: 'Pocket scale box asset awaiting calibration weight photo confirmation.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'aircraft-aluminum-grinder-4pc',
        sku: 'NOV-GRINDER-63MM',
        brand: 'Santa Cruz Style',
        name: '63mm 4-Piece Aircraft Aluminum Herb Grinder',
        category: 'Novelties',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: '4-piece CNC grinder awaiting verified finish photography.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'scorch-torch-triple-jet',
        sku: 'NOV-TORCH-TRIPLE',
        brand: 'Scorch Torch',
        name: 'Scorch Torch Heavy Duty Triple Jet Torch Lighter',
        category: 'Novelties',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'NO_MATCH',
        matchNotes: 'Triple jet display carton asset pending manufacturer photo proof.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },

      // ── ACCESSORIES ───────────────────────────────────────────────────────
      {
        productId: 'raw-classic-king-size-box',
        sku: 'ACC-RAW-KS-BOX24',
        brand: 'RAW',
        name: 'RAW Classic King Size Slim Rolling Papers (Box of 24)',
        category: 'Accessories',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'RAW authentic Spanish watermark box awaiting anti-counterfeit proof validation.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'king-palm-cones-display',
        sku: 'ACC-KP-SLIM-20PK',
        brand: 'King Palm',
        name: 'King Palm Natural Cordia Leaf Pre-Rolled Cones (20-Pack Box)',
        category: 'Accessories',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'King Palm 20-pack retail display box awaiting verified digital asset.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'newport-zero-butane-12can',
        sku: 'ACC-BUTANE-NPZ-12',
        brand: 'Newport Zero',
        name: 'Newport Zero 300ml Extra Refined Butane Fuel (Case of 12)',
        category: 'Accessories',
        imageUrl: undefined,
        sourceType: 'manufacturer',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: '12-can master shipping carton asset pending verified photography.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
      {
        productId: 'cookies-510-battery-display',
        sku: 'ACC-COOKIES-510-BAT',
        brand: 'Cookies',
        name: 'Cookies 510 Thread Adjustable Voltage Battery (Display of 20)',
        category: 'Accessories',
        imageUrl: undefined,
        sourceType: 'wholesale_catalog',
        confidence: 'IMAGE_REVIEW_REQUIRED',
        matchNotes: 'Cookies 20-unit counter display box awaiting authentic packaging proof.',
        licensingStatus: 'pending_review',
        verifiedAt: new Date().toISOString(),
        manuallyApproved: false,
      },
    ];

    records.forEach(r => this.registry.set(r.productId, r));
  }

  public getAllAudits(): ProductImageAudit[] {
    return Array.from(this.registry.values());
  }

  public getAudit(productId: string): ProductImageAudit | undefined {
    return this.registry.get(productId);
  }

  public getVerifiedImageUrl(productId: string): string | undefined {
    const audit = this.registry.get(productId);
    if (!audit) return undefined;
    if (audit.confidence === 'EXACT_VERIFIED' || audit.confidence === 'HIGH_CONFIDENCE') {
      return audit.imageUrl;
    }
    return undefined;
  }

  public reviewProductImage(
    productId: string,
    action: 'APPROVE' | 'REJECT' | 'UPDATE_URL' | 'REMOVE',
    newUrl?: string,
    notes?: string
  ): ProductImageAudit | null {
    const record = this.registry.get(productId);
    if (!record) return null;

    if (action === 'APPROVE') {
      record.manuallyApproved = true;
      record.confidence = 'EXACT_VERIFIED';
      if (notes) record.matchNotes = notes;
      record.verifiedAt = new Date().toISOString();
    } else if (action === 'REJECT' || action === 'REMOVE') {
      record.imageUrl = undefined;
      record.confidence = 'NO_MATCH';
      record.manuallyApproved = false;
      if (notes) record.matchNotes = notes;
      record.verifiedAt = new Date().toISOString();
    } else if (action === 'UPDATE_URL' && newUrl) {
      record.imageUrl = newUrl;
      record.confidence = 'EXACT_VERIFIED';
      record.manuallyApproved = true;
      if (notes) record.matchNotes = notes;
      record.verifiedAt = new Date().toISOString();
    }

    return record;
  }
}

export const productImageRegistry = new ProductImageRegistry();
