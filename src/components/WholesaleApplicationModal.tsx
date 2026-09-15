import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Phone,
  FileText,
  Clock,
  AlertCircle,
  Loader2,
  Upload,
  FileCheck,
  CheckCircle2,
  Globe,
  HelpCircle,
  LogIn
} from 'lucide-react';

interface WholesaleApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenLogin?: () => void;
}

interface UploadedDocState {
  file: File | null;
  documentId?: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
}

export default function WholesaleApplicationModal({ isOpen, onClose, onOpenLogin }: WholesaleApplicationModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [dba, setDba] = useState('');
  const [contactFirstName, setContactFirstName] = useState('');
  const [contactLastName, setContactLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [fein, setFein] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [businessType, setBusinessType] = useState('vape_shop');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Oklahoma City');
  const [state, setState] = useState('OK');
  const [zip, setZip] = useState('');
  const [website, setWebsite] = useState('');
  const [notes, setNotes] = useState('');
  const [ageCertified, setAgeCertified] = useState(false);
  const [taxExemptCertified, setTaxExemptCertified] = useState(false);

  // Document Upload States
  const [resaleDoc, setResaleDoc] = useState<UploadedDocState>({ file: null, status: 'idle' });
  const [licenseDoc, setLicenseDoc] = useState<UploadedDocState>({ file: null, status: 'idle' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateType, setDuplicateType] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState<{ id: string; businessName: string; email: string } | null>(null);

  const resaleInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const uploadDocument = async (file: File, docType: 'resale_certificate' | 'business_license') => {
    const base64 = await fileToBase64(file);
    const res = await fetch('/api/wholesale/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileBase64: base64,
        filename: file.name,
        documentType: docType,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to upload document.');
    }
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-clicks

    setErrorMessage(null);
    setDuplicateType(null);

    if (!contactFirstName.trim() || !contactLastName.trim()) {
      setErrorMessage('Please provide both first and last name for the authorized contact.');
      return;
    }

    if (!ageCertified) {
      setErrorMessage('You must certify that you are at least 21 years of age and authorized to purchase for this business.');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedDocs = [];

      // 1. Upload Resale Certificate if selected
      if (resaleDoc.file) {
        try {
          const resResale = await uploadDocument(resaleDoc.file, 'resale_certificate');
          uploadedDocs.push({
            id: resResale.documentId,
            type: 'resale_certificate',
            filename: resaleDoc.file.name,
          });
        } catch (uploadErr: any) {
          throw new Error(`Resale certificate upload failed: ${uploadErr.message}`);
        }
      }

      // 2. Upload Business License if selected
      if (licenseDoc.file) {
        try {
          const resLicense = await uploadDocument(licenseDoc.file, 'business_license');
          uploadedDocs.push({
            id: resLicense.documentId,
            type: 'business_license',
            filename: licenseDoc.file.name,
          });
        } catch (uploadErr: any) {
          throw new Error(`Business license upload failed: ${uploadErr.message}`);
        }
      }

      // 3. Submit wholesale application
      const contactName = `${contactFirstName.trim()} ${contactLastName.trim()}`;
      const res = await fetch('/api/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          dba: dba.trim() || undefined,
          contactFirstName: contactFirstName.trim(),
          contactLastName: contactLastName.trim(),
          contactName,
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          fein: fein.trim(),
          licenseNumber: licenseNumber.trim() || undefined,
          businessType,
          address: {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            zip: zip.trim(),
          },
          website: website.trim() || undefined,
          notes: notes.trim() || undefined,
          ageCertified,
          taxExemptCertified,
          documents: uploadedDocs,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'ACCOUNT_ALREADY_EXISTS') {
          setDuplicateType('APPROVED');
          setErrorMessage(data.message || 'An active wholesale account already exists for this email address.');
          return;
        }
        if (data.error === 'APPLICATION_PENDING') {
          setDuplicateType('PENDING');
          setErrorMessage(data.message || 'Your wholesale account application is currently under review.');
          return;
        }
        if (data.error === 'APPLICATION_REJECTED') {
          setDuplicateType('REJECTED');
          setErrorMessage(data.message || 'An application for this email address was previously reviewed.');
          return;
        }
        if (data.error === 'ACCOUNT_SUSPENDED') {
          setDuplicateType('SUSPENDED');
          setErrorMessage(data.message || 'An account for this email is currently suspended.');
          return;
        }
        throw new Error(data.error || 'Failed to submit application.');
      }

      setApplicationSuccess({
        id: data.applicationId || 'WOA-APP-' + Math.floor(10000 + Math.random() * 90000),
        businessName,
        email: email.trim().toLowerCase(),
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while submitting your application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setApplicationSuccess(null);
    setErrorMessage(null);
    setDuplicateType(null);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#0B0D10]/85 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wholesale-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-[#15191F] rounded-3xl shadow-2xl border border-[#2A3038] overflow-hidden my-8 text-[#F7F7F5]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1B2027] text-[#F7F7F5] px-6 py-5 flex items-center justify-between border-b border-[#2A3038]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FF6B00] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="wholesale-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-[#F7F7F5]">
                Apply for Wholesale Account
              </h2>
              <p className="text-xs text-[#858C96]">
                Licensed B2B Retailers • Wholesale Pricing & Compliance Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#15191F] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto">
          {applicationSuccess ? (
            /* Prominent APPLICATION RECEIVED / ACCOUNT UNDER REVIEW Screen */
            <div className="py-4 space-y-6 text-center animate-fadeIn">
              <div className="w-20 h-20 rounded-2xl bg-[#FF6B00]/15 text-[#FF6B00] flex items-center justify-center mx-auto border border-[#FF6B00]/30 shadow-lg">
                <Clock className="w-11 h-11" />
              </div>

              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/40 text-amber-400 text-xs font-bold uppercase tracking-widest px-4 py-1.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  Application Received — Under Review
                </div>
                <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-[#F7F7F5]">
                  ACCOUNT UNDER REVIEW
                </h3>
                <div className="inline-block bg-[#1B2027] border border-[#2A3038] rounded-xl px-5 py-2.5 text-sm font-mono font-bold text-[#F7F7F5] shadow-inner">
                  Reference ID: <span className="text-[#FF6B00]">{applicationSuccess.id}</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl bg-[#1B2027] border border-[#2A3038] max-w-lg mx-auto text-sm text-[#B8BDC5] leading-relaxed text-left space-y-3">
                <p className="font-semibold text-[#F7F7F5]">
                  Your Wholesale of Oklahoma account application is currently under review.
                </p>
                <p>
                  Thank you for submitting your wholesale account application for <strong>{applicationSuccess.businessName}</strong>.
                </p>
                <p>
                  Our compliance team will review your business information. If your application is approved, you will receive an email at <strong className="text-[#F7F7F5]">{applicationSuccess.email}</strong> containing a secure link with instructions to activate your account and create your login credentials.
                </p>
                <div className="bg-[#15191F] border border-amber-500/30 rounded-xl p-3.5 text-amber-300 text-xs font-medium">
                  <strong>Notice:</strong> Please do not submit another application while your current application is under review. You do not have shopping or login access yet.
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-6 py-3 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] text-white font-bold text-sm transition-colors shadow-md cursor-pointer"
                >
                  Return to Storefront
                </button>
              </div>

              <div className="pt-2 text-xs text-[#626871]">
                Wholesale of Oklahoma • Central OKC Wholesale Warehouse • Dispatch: (405) 768-2975
              </div>
            </div>
          ) : (
            /* Application Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Duplicate or Error Banner */}
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>Application Notice</span>
                  </div>
                  <p className="text-xs leading-relaxed text-red-300">{errorMessage}</p>

                  {duplicateType === 'APPROVED' && onOpenLogin && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenLogin();
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FF6B00] text-white font-bold text-xs hover:bg-[#E05E00] transition-colors cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" /> Go to Customer Sign In
                      </button>
                    </div>
                  )}

                  {duplicateType === 'PENDING' && (
                    <div className="pt-1 text-xs text-amber-300 font-medium">
                      Our dispatch team reviews applications within 1 business day. Contact dispatch at (405) 768-2975 for urgent requests.
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 1: BUSINESS ENTITY INFORMATION */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FF6B00] uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>1. Business Information</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Legal Business Name <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sooner State Vapor LLC"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      DBA / Store Front Name <span className="text-[#626871]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={dba}
                      onChange={(e) => setDba(e.target.value)}
                      placeholder="e.g. Sooner Vapor"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Business Type <span className="text-[#FF6B00]">*</span>
                    </label>
                    <select
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors cursor-pointer"
                    >
                      <option value="vape_shop">Vape & Smoke Retailer</option>
                      <option value="smoke_shop">Smoke Shop / Head Shop</option>
                      <option value="dispensary">Licensed Dispensary</option>
                      <option value="c_store">Convenience Store</option>
                      <option value="distributor">Sub-Distributor / Jobber</option>
                      <option value="other">Other Commercial Reseller</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: AUTHORIZED CONTACT */}
              <div className="space-y-4 pt-2 border-t border-[#2A3038]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FF6B00] uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>2. Authorized Contact</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      First Name <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactFirstName}
                      onChange={(e) => setContactFirstName(e.target.value)}
                      placeholder="Alex"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Last Name <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={contactLastName}
                      onChange={(e) => setContactLastName(e.target.value)}
                      placeholder="Mercer"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Business Email Address <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="purchasing@company.com"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Contact Phone <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) 555-0199"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: PHYSICAL BUSINESS ADDRESS */}
              <div className="space-y-4 pt-2 border-t border-[#2A3038]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FF6B00] uppercase tracking-wider">
                  <Building2 className="w-4 h-4" />
                  <span>3. Physical Business Address</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Street Address <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="123 SW 29th St"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      City <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Oklahoma City"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      State <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="OK"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      ZIP Code <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="73109"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: TAX ID & COMPLIANCE LICENSES */}
              <div className="space-y-4 pt-2 border-t border-[#2A3038]">
                <div className="flex items-center gap-2 text-sm font-bold text-[#FF6B00] uppercase tracking-wider">
                  <FileText className="w-4 h-4" />
                  <span>4. Tax Identification & Permits</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Federal Employer ID (FEIN) / State Tax ID <span className="text-[#FF6B00]">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={fein}
                      onChange={(e) => setFein(e.target.value)}
                      placeholder="XX-XXXXXXX"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Oklahoma Sales Tax / Resale Permit Number <span className="text-[#626871]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. OK-RES-12345"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Business Website <span className="text-[#626871]">(Optional)</span>
                    </label>
                    <input
                      type="url"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="https://www.yourshop.com"
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#858C96] mb-1.5">
                      Additional Notes / Inquiries <span className="text-[#626871]">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Brands you are seeking, volume requests..."
                      className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-4 py-2.5 text-sm text-[#F7F7F5] focus:outline-none focus:border-[#FF6B00] transition-colors"
                    />
                  </div>
                </div>

                {/* Optional Document Uploads */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-[#1B2027] border border-[#2A3038] space-y-2">
                    <span className="text-xs font-semibold text-[#F7F7F5] block">
                      Resale Certificate / Tax Exemption (PDF / Image)
                    </span>
                    <input
                      type="file"
                      ref={resaleInputRef}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setResaleDoc({ file, status: file ? 'uploaded' : 'idle' });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => resaleInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-[#15191F] hover:bg-[#2A3038] border border-[#2A3038] text-xs font-medium text-[#B8BDC5] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {resaleDoc.file ? (
                        <>
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate">{resaleDoc.file.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <span>Attach Resale Permit</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#1B2027] border border-[#2A3038] space-y-2">
                    <span className="text-xs font-semibold text-[#F7F7F5] block">
                      Tobacco / Business License (PDF / Image)
                    </span>
                    <input
                      type="file"
                      ref={licenseInputRef}
                      accept=".pdf,.png,.jpg,.jpeg"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0] || null;
                        setLicenseDoc({ file, status: file ? 'uploaded' : 'idle' });
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => licenseInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-[#15191F] hover:bg-[#2A3038] border border-[#2A3038] text-xs font-medium text-[#B8BDC5] flex items-center justify-center gap-2 transition-colors cursor-pointer"
                    >
                      {licenseDoc.file ? (
                        <>
                          <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="truncate">{licenseDoc.file.name}</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-3.5 h-3.5 text-[#FF6B00]" />
                          <span>Attach Retail License</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* SECTION 5: LEGAL CERTIFICATIONS */}
              <div className="space-y-3 pt-2 border-t border-[#2A3038]">
                <label className="flex items-start gap-3 p-3 rounded-xl bg-[#1B2027] border border-[#2A3038] cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                  <input
                    type="checkbox"
                    required
                    checked={ageCertified}
                    onChange={(e) => setAgeCertified(e.target.checked)}
                    className="mt-0.5 rounded border-[#2A3038] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                  />
                  <span className="text-xs text-[#B8BDC5] leading-relaxed">
                    <strong className="text-[#F7F7F5]">21+ Age Certification & Purchasing Authority:</strong> I certify that I am at least 21 years of age and an authorized representative of this retail commercial entity. <span className="text-[#FF6B00]">*</span>
                  </span>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-xl bg-[#1B2027] border border-[#2A3038] cursor-pointer hover:border-[#FF6B00]/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={taxExemptCertified}
                    onChange={(e) => setTaxExemptCertified(e.target.checked)}
                    className="mt-0.5 rounded border-[#2A3038] text-[#FF6B00] focus:ring-[#FF6B00] cursor-pointer"
                  />
                  <span className="text-xs text-[#B8BDC5] leading-relaxed">
                    <strong className="text-[#F7F7F5]">Tax-Exempt Resale Certification:</strong> Products purchased under this wholesale account are intended strictly for commercial retail resale under Oklahoma and Federal regulations.
                  </span>
                </label>
              </div>

              {/* Submit Actions */}
              <div className="pt-4 border-t border-[#2A3038] flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-[#858C96] text-center sm:text-left">
                  Applications are manually reviewed by our compliance desk.
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-[#2A3038] hover:bg-[#1B2027] text-sm font-semibold text-[#B8BDC5] hover:text-[#F7F7F5] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-[#FF6B00] hover:bg-[#E05E00] disabled:bg-[#FF6B00]/50 text-white font-bold text-sm shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Submitting Application...</span>
                      </>
                    ) : (
                      <span>Submit Wholesale Application</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
