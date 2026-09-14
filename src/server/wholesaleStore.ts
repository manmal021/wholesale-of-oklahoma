/**
 * wholesaleStore.ts
 * Manages wholesale customer applications, business licenses,
 * tax exemption certificates (FEIN / Oklahoma Resale Permit),
 * and customer verification states (OWASP A01 / Rules 29 & 30).
 */

export interface WholesaleApplication {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string;
  fein: string; // Federal Employer Identification Number or State Tax ID
  licenseNumber: string; // State Tobacco / Retail / Resale Permit
  businessType: 'vape_shop' | 'smoke_shop' | 'dispensary' | 'c_store' | 'distributor' | 'other';
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  ageCertified: boolean;
  taxExemptCertified: boolean;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED';
  reviewNotes?: string;
  reviewedAt?: string;
  submittedAt: string;
}

class WholesaleStore {
  private applications: Map<string, WholesaleApplication> = new Map();

  constructor() {
    // Seed an approved demo/sample wholesale account for verification testing
    const seedId = 'WOA-APP-10001';
    this.applications.set(seedId, {
      id: seedId,
      businessName: 'OKC Vapor Lounge LLC',
      contactName: 'Alex Mercer',
      email: 'alex@okcvaporlounge.com',
      phone: '(405) 555-0199',
      fein: '73-1234567',
      licenseNumber: 'OK-TOB-89214',
      businessType: 'vape_shop',
      address: {
        street: '123 SW 29th St',
        city: 'Oklahoma City',
        state: 'OK',
        zip: '73109',
      },
      ageCertified: true,
      taxExemptCertified: true,
      status: 'APPROVED',
      reviewNotes: 'Verified OTC Resale Permit and FEIN.',
      reviewedAt: new Date().toISOString(),
      submittedAt: new Date(Date.now() - 86400000).toISOString(),
    });
  }

  public createApplication(data: Omit<WholesaleApplication, 'id' | 'status' | 'submittedAt'>): WholesaleApplication {
    const randomSuffix = Math.floor(10000 + Math.random() * 90000);
    const id = `WOA-APP-${randomSuffix}`;

    const newApp: WholesaleApplication = {
      ...data,
      id,
      status: 'PENDING_REVIEW',
      submittedAt: new Date().toISOString(),
    };

    this.applications.set(id, newApp);
    return newApp;
  }

  public getApplication(id: string): WholesaleApplication | undefined {
    return this.applications.get(id);
  }

  public findByEmail(email: string): WholesaleApplication[] {
    const cleanEmail = email.toLowerCase().trim();
    const matches: WholesaleApplication[] = [];
    for (const app of this.applications.values()) {
      if (app.email.toLowerCase().trim() === cleanEmail) {
        matches.push(app);
      }
    }
    return matches;
  }

  public listApplications(statusFilter?: string): WholesaleApplication[] {
    const list = Array.from(this.applications.values());
    if (statusFilter) {
      return list.filter((a) => a.status === statusFilter);
    }
    return list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
  }

  public reviewApplication(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ): WholesaleApplication | null {
    const app = this.applications.get(id);
    if (!app) return null;

    app.status = status;
    app.reviewNotes = reviewNotes;
    app.reviewedAt = new Date().toISOString();

    return app;
  }
}

export const wholesaleStore = new WholesaleStore();
