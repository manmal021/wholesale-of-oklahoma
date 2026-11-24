/**
 * wholesaleStore.ts
 * Manages wholesale customer applications, business licenses,
 * tax exemption certificates (FEIN / Oklahoma Resale Permit),
 * and customer verification states.
 *
 * Backed persistently by databaseStore.ts.
 */

import { databaseStore, type WholesaleApplicationRecord, type ApplicationStatus } from '../repositories/databaseStore.js';

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
  documents?: Array<{
    documentId: string;
    documentType: string;
    filename: string;
  }>;
  status: 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  reviewNotes?: string;
  reviewedAt?: string;
  submittedAt: string;
}

function toLegacyApp(record: WholesaleApplicationRecord): WholesaleApplication {
  let legacyStatus: WholesaleApplication['status'] = 'PENDING_REVIEW';
  if (record.status === 'APPROVED') legacyStatus = 'APPROVED';
  else if (record.status === 'REJECTED') legacyStatus = 'REJECTED';
  else if (record.status === 'SUSPENDED') legacyStatus = 'SUSPENDED';

  return {
    id: record.id,
    businessName: record.businessName,
    contactName: record.contactName,
    email: record.email,
    phone: record.phone,
    fein: record.fein,
    licenseNumber: record.licenseNumber,
    businessType: record.businessType as WholesaleApplication['businessType'],
    address: record.address,
    ageCertified: record.ageCertified,
    taxExemptCertified: record.taxExemptCertified,
    documents: record.documents,
    status: legacyStatus,
    reviewNotes: record.reviewNotes,
    reviewedAt: record.reviewedAt,
    submittedAt: record.submittedAt,
  };
}

class WholesaleStore {
  public async createApplication(data: Omit<WholesaleApplication, 'id' | 'status' | 'submittedAt'>): Promise<WholesaleApplication> {
    const contactParts = (data.contactName || '').trim().split(/\s+/);
    const firstName = contactParts[0] || 'Authorized';
    const lastName = contactParts.slice(1).join(' ') || 'Representative';

    const record = await databaseStore.createApplication({
      businessName: data.businessName,
      contactFirstName: firstName,
      contactLastName: lastName,
      contactName: data.contactName,
      email: data.email,
      phone: data.phone,
      fein: data.fein,
      licenseNumber: data.licenseNumber,
      businessType: data.businessType,
      address: data.address,
      ageCertified: data.ageCertified,
      taxExemptCertified: data.taxExemptCertified,
      documents: data.documents,
    });

    return toLegacyApp(record);
  }

  public async getApplication(id: string): Promise<WholesaleApplication | undefined> {
    const record = await databaseStore.getApplication(id);
    return record ? toLegacyApp(record) : undefined;
  }

  public async findByEmail(email: string): Promise<WholesaleApplication[]> {
    const records = await databaseStore.findApplicationsByEmail(email);
    return records.map(toLegacyApp);
  }

  public async listApplications(statusFilter?: string): Promise<WholesaleApplication[]> {
    let filter: ApplicationStatus | 'ALL' | undefined;
    if (statusFilter === 'PENDING_REVIEW' || statusFilter === 'PENDING') {
      filter = 'PENDING';
    } else if (statusFilter === 'APPROVED' || statusFilter === 'REJECTED' || statusFilter === 'SUSPENDED') {
      filter = statusFilter;
    }

    const records = await databaseStore.listApplications(filter);
    return records.map(toLegacyApp);
  }

  public async reviewApplication(
    id: string,
    status: 'APPROVED' | 'REJECTED',
    reviewNotes?: string
  ): Promise<WholesaleApplication | null> {
    const updated = await databaseStore.updateApplicationStatus(id, status, 'system_admin', reviewNotes);
    return updated ? toLegacyApp(updated) : null;
  }
}

export const wholesaleStore = new WholesaleStore();
