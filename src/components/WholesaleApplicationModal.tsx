import React, { useState, useEffect, useRef } from 'react';
import { X, ShieldCheck, Building2, User, Mail, Phone, FileText, CheckCircle2, AlertCircle, Loader2, Upload, FileCheck, Lock } from 'lucide-react';

interface WholesaleApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UploadedDocState {
  file: File | null;
  documentId?: string;
  status: 'idle' | 'uploading' | 'uploaded' | 'error';
  errorMessage?: string;
}

export default function WholesaleApplicationModal({ isOpen, onClose }: WholesaleApplicationModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [dba, setDba] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [fein, setFein] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [businessType, setBusinessType] = useState('vape_shop');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('Oklahoma City');
  const [state, setState] = useState('OK');
  const [zip, setZip] = useState('');
  const [ageCertified, setAgeCertified] = useState(false);
  const [taxExemptCertified, setTaxExemptCertified] = useState(false);

  // Document Upload States
  const [resaleDoc, setResaleDoc] = useState<UploadedDocState>({ file: null, status: 'idle' });
  const [licenseDoc, setLicenseDoc] = useState<UploadedDocState>({ file: null, status: 'idle' });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState<{ id: string; businessName: string } | null>(null);

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
    setErrorMessage(null);

    if (!ageCertified) {
      setErrorMessage('You must certify that you are at least 21 years of age.');
      return;
    }

    setIsSubmitting(true);

    try {
      const uploadedDocs = [];

      // 1. Upload Resale Certificate if selected
      if (resaleDoc.file) {
        setResaleDoc((prev) => ({ ...prev, status: 'uploading' }));
        const uploaded = await uploadDocument(resaleDoc.file, 'resale_certificate');
        setResaleDoc((prev) => ({ ...prev, status: 'uploaded', documentId: uploaded.documentId }));
        uploadedDocs.push({
          documentId: uploaded.documentId,
          documentType: 'resale_certificate',
          filename: resaleDoc.file.name,
        });
      }

      // 2. Upload Business Permit if selected
      if (licenseDoc.file) {
        setLicenseDoc((prev) => ({ ...prev, status: 'uploading' }));
        const uploaded = await uploadDocument(licenseDoc.file, 'business_license');
        setLicenseDoc((prev) => ({ ...prev, status: 'uploaded', documentId: uploaded.documentId }));
        uploadedDocs.push({
          documentId: uploaded.documentId,
          documentType: 'business_license',
          filename: licenseDoc.file.name,
        });
      }

      // 3. Submit Wholesale Application
      const res = await fetch('/api/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: dba ? `${businessName} (DBA: ${dba})` : businessName,
          contactName,
          email,
          password: password || undefined,
          phone,
          fein,
          licenseNumber,
          businessType,
          address: { street, city, state, zip },
          ageCertified,
          taxExemptCertified,
          documents: uploadedDocs,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit application');
      }

      setApplicationSuccess({
        id: data.applicationId,
        businessName,
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
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#0f172A]/75 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wholesale-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#0f172A] text-white px-6 py-5 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="wholesale-modal-title" className="text-lg sm:text-xl font-bold tracking-tight text-white">
                Apply for Wholesale Account
              </h2>
              <p className="text-xs text-slate-300">
                Licensed B2B Retailers • Tax-Exempt Wholesale Pricing Portal
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close wholesale application modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 sm:p-8 max-h-[82vh] overflow-y-auto">
          {applicationSuccess ? (
            /* Success Confirmation Screen (Requirement 7) */
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <div className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-800 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Status: Pending Review
                </div>
                <h3 className="text-2xl font-extrabold text-[#0f172A]">Application Received!</h3>
                <div className="inline-block bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono font-bold text-[#0f172A]">
                  Reference ID: <span className="text-[#F97316]">{applicationSuccess.id}</span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 max-w-lg mx-auto text-sm text-slate-700 leading-relaxed text-left space-y-2">
                <p className="font-semibold text-slate-900">
                  Your Wholesale of Oklahoma account application has been received and is pending review.
                </p>
                <p className="text-xs text-slate-600">
                  Our compliance team is verifying your business license and resale tax information. Once approved, wholesale catalog pricing will be automatically unlocked for your account.
                </p>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-lg mx-auto space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Need Immediate Restock Dispatch?</h4>
                <p className="text-xs text-slate-600">
                  Call our live warehouse desk in Oklahoma City with your Reference ID for expedited phone quotes and same-day pickup.
                </p>
                <a
                  href="tel:4057682975"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#F97316] hover:underline pt-1"
                >
                  <Phone className="w-3.5 h-3.5" /> (405) 768-2975 · Central OKC Dispatch
                </a>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-8 py-3 bg-[#0f172A] hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-widest rounded-full transition-colors cursor-pointer shadow"
                >
                  Return to Store
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Submission Error: </strong>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 leading-relaxed">
                <strong className="font-semibold block mb-1">State of Oklahoma B2B Wholesale Notice:</strong>
                Wholesale of Oklahoma sells exclusively to verified commercial businesses holding a valid Federal EIN or Oklahoma Sales Tax Resale Permit. We do not sell directly to the public.
              </div>

              {/* 1. Business Details */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#F97316]" /> 1. Business Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="apply-business-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-business-name"
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Sooner Vape Hub LLC"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label htmlFor="apply-dba" className="block text-xs font-semibold text-slate-700 mb-1">
                      DBA / Store Front Name (Optional)
                    </label>
                    <input
                      id="apply-dba"
                      type="text"
                      value={dba}
                      onChange={(e) => setDba(e.target.value)}
                      placeholder="e.g. Metro Smoke & Vape"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label htmlFor="apply-business-type" className="block text-xs font-semibold text-slate-700 mb-1">
                      Type of Business <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="apply-business-type"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] bg-white"
                    >
                      <option value="vape_shop">Vape / E-Cigarette Shop</option>
                      <option value="smoke_shop">Smoke / Tobacco Shop</option>
                      <option value="dispensary">Licensed Dispensary</option>
                      <option value="c_store">Convenience Store</option>
                      <option value="distributor">Sub-Distributor / Wholesaler</option>
                      <option value="other">Other Commercial Retailer</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="apply-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) 555-0199"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Physical Location */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172A] mb-3">Store Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="apply-street" className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-street"
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="123 Main St"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-city" className="block text-xs font-semibold text-slate-700 mb-1">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-city"
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Oklahoma City"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                  <div>
                    <label htmlFor="apply-zip" className="block text-xs font-semibold text-slate-700 mb-1">
                      ZIP Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-zip"
                      type="text"
                      required
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="73109"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Tax ID & Licensing */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F97316]" /> 2. Tax & License Identification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="apply-fein" className="block text-xs font-semibold text-slate-700 mb-1">
                      Federal EIN (FEIN) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-fein"
                      type="text"
                      required
                      value={fein}
                      onChange={(e) => setFein(e.target.value)}
                      placeholder="e.g. 73-XXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label htmlFor="apply-license" className="block text-xs font-semibold text-slate-700 mb-1">
                      State Sales Tax / Resale Permit Number
                    </label>
                    <input
                      id="apply-license"
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. OK-RES-XXXXX"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Document Upload Portal (Requirement 6) */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172A] flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-[#F97316]" /> Secure Document Upload Portal
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Upload official verification documents (PDF, JPG, JPEG, PNG • max 10MB per file). Documents are encrypted and stored in private storage.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Upload 1: Sales Tax Resale Certificate */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Sales Tax ID / Resale Certificate
                    </label>

                    <input
                      type="file"
                      ref={resaleInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setResaleDoc({ file: f, status: 'idle' });
                      }}
                    />

                    {resaleDoc.file ? (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-900 truncate">{resaleDoc.file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setResaleDoc({ file: null, status: 'idle' })}
                          className="text-slate-400 hover:text-red-500 cursor-pointer shrink-0 ml-2"
                          aria-label="Remove resale document"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => resaleInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-[#F97316] rounded-lg text-xs font-semibold text-slate-600 hover:text-[#F97316] flex items-center justify-center gap-2 transition-colors cursor-pointer bg-slate-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Resale Certificate</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 block">Accepted: PDF, JPG, PNG (Max 10MB)</span>
                  </div>

                  {/* Upload 2: Business Permit / License */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Business Permit / Tobacco License
                    </label>

                    <input
                      type="file"
                      ref={licenseInputRef}
                      accept=".pdf,.jpg,.jpeg,.png"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setLicenseDoc({ file: f, status: 'idle' });
                      }}
                    />

                    {licenseDoc.file ? (
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                        <div className="flex items-center gap-2 truncate">
                          <FileCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span className="font-semibold text-emerald-900 truncate">{licenseDoc.file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setLicenseDoc({ file: null, status: 'idle' })}
                          className="text-slate-400 hover:text-red-500 cursor-pointer shrink-0 ml-2"
                          aria-label="Remove license document"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => licenseInputRef.current?.click()}
                        className="w-full py-2.5 px-3 border border-dashed border-slate-300 hover:border-[#F97316] rounded-lg text-xs font-semibold text-slate-600 hover:text-[#F97316] flex items-center justify-center gap-2 transition-colors cursor-pointer bg-slate-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Choose Permit / License</span>
                      </button>
                    )}
                    <span className="text-[10px] text-slate-400 block">Accepted: PDF, JPG, PNG (Max 10MB)</span>
                  </div>
                </div>
              </div>

              {/* 5. Contact Person & Login Setup */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#F97316]" /> 3. Authorized Contact & Portal Login
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="apply-contact-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Contact Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-contact-name"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Authorized Buyer"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label htmlFor="apply-email" className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="apply-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@business.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>

                  <div>
                    <label htmlFor="apply-password" className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#F97316]" /> Set Portal Password
                    </label>
                    <input
                      id="apply-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316]"
                    />
                  </div>
                </div>
              </div>

              {/* 6. Legal Certifications */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={ageCertified}
                    onChange={(e) => setAgeCertified(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#F97316] rounded border-slate-300 focus:ring-[#F97316]"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Age Certification (21+):</strong> I certify under penalty of law that I am at least 21 years of age and legally authorized to purchase regulated merchandise on behalf of this commercial entity.
                  </span>
                </label>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxExemptCertified}
                    onChange={(e) => setTaxExemptCertified(e.target.checked)}
                    className="mt-1 w-4 h-4 text-[#F97316] rounded border-slate-300 focus:ring-[#F97316]"
                  />
                  <span className="text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Resale Tax Exemption:</strong> All products purchased through this wholesale account are intended for commercial resale and comply with Oklahoma Sales Tax Exemption rules.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-7 py-3 bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Submitting Application & Documents...</span>
                    </>
                  ) : (
                    <span>Submit Wholesale Application</span>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
