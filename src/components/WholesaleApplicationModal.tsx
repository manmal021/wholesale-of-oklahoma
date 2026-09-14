import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Building2, User, Mail, Phone, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface WholesaleApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WholesaleApplicationModal({ isOpen, onClose }: WholesaleApplicationModalProps) {
  const [businessName, setBusinessName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState<{ id: string; businessName: string } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!ageCertified) {
      setErrorMessage('You must certify that you are at least 21 years of age.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/wholesale/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName,
          contactName,
          email,
          phone,
          fein,
          licenseNumber,
          businessType,
          address: { street, city, state, zip },
          ageCertified,
          taxExemptCertified,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-[#0f172A]/70 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wholesale-modal-title"
    >
      <div
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8"
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
                Wholesale Account Application
              </h2>
              <p className="text-xs text-slate-300">
                Licensed B2B Retailers & Dispensaries • Tax-Exempt Purchasing
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
        <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto">
          {applicationSuccess ? (
            <div className="text-center py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <h3 className="text-2xl font-bold text-[#0f172A] mb-2">Application Submitted!</h3>
              <div className="inline-block bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm font-mono font-bold text-[#0f172A] mb-4">
                Reference ID: <span className="text-[#F97316]">{applicationSuccess.id}</span>
              </div>
              <p className="text-slate-600 text-sm max-w-md mx-auto mb-6 leading-relaxed">
                Thank you for registering <strong className="text-slate-900">{applicationSuccess.businessName}</strong>.
                Our Oklahoma compliance and dispatch team will verify your FEIN and resale permit within 1 business day.
              </p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Need immediate order dispatch?</h4>
                <p className="text-sm text-slate-700 mb-2">
                  Call our Oklahoma City warehouse dispatcher directly with your Reference ID for expedited same-day pickup.
                </p>
                <a
                  href="tel:4057682975"
                  className="inline-flex items-center gap-2 text-sm font-bold text-[#F97316] hover:underline"
                >
                  <Phone className="w-4 h-4" /> (405) 768-2975
                </a>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="w-full sm:w-auto px-8 py-3 bg-[#0f172A] hover:bg-slate-800 text-white font-bold rounded-xl transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-sm text-red-700" role="alert">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
                  <div>
                    <strong className="font-semibold">Submission error: </strong>
                    {errorMessage}
                  </div>
                </div>
              )}

              <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4 text-xs text-amber-900 leading-relaxed">
                <strong className="font-semibold block mb-1">State of Oklahoma B2B Wholesale Notice:</strong>
                Wholesale of Oklahoma sells exclusively to verified commercial businesses holding a valid Federal Employer ID (FEIN) or Oklahoma Sales Tax Resale Permit. We do not sell directly to the public.
              </div>

              {/* Business Details */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-[#F97316]" /> Business Entity
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-business-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Legal Business Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-business-name"
                      type="text"
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="e.g. Metro Smoke LLC"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-business-type" className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Type <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="modal-business-type"
                      value={businessType}
                      onChange={(e) => setBusinessType(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent bg-white"
                    >
                      <option value="vape_shop">Vape / E-Cigarette Shop</option>
                      <option value="smoke_shop">Smoke / Tobacco Shop</option>
                      <option value="dispensary">Licensed Dispensary</option>
                      <option value="c_store">Convenience Store</option>
                      <option value="distributor">Sub-Distributor / Wholesaler</option>
                      <option value="other">Other Commercial Retailer</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Tax & License Verification */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#F97316]" /> Tax & Licensing Verification
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="modal-fein" className="block text-xs font-semibold text-slate-700 mb-1">
                      Federal Employer ID (FEIN) / Tax ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-fein"
                      type="text"
                      required
                      value={fein}
                      onChange={(e) => setFein(e.target.value)}
                      placeholder="e.g. 73-XXXXXXX"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-license" className="block text-xs font-semibold text-slate-700 mb-1">
                      State Resale / Tobacco Permit Number
                    </label>
                    <input
                      id="modal-license"
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="e.g. OK-RES-XXXXX"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Contact Information */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f172A] mb-3 flex items-center gap-2">
                  <User className="w-4 h-4 text-[#F97316]" /> Authorized Contact
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="modal-contact-name" className="block text-xs font-semibold text-slate-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-contact-name"
                      type="text"
                      required
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                      placeholder="Authorized Buyer"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-email" className="block text-xs font-semibold text-slate-700 mb-1">
                      Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="buyer@business.com"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-phone" className="block text-xs font-semibold text-slate-700 mb-1">
                      Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="modal-phone"
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(405) XXX-XXXX"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Business Address */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0f172A] mb-3">Store Location</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="sm:col-span-2">
                    <label htmlFor="modal-street" className="block text-xs font-semibold text-slate-700 mb-1">
                      Street Address
                    </label>
                    <input
                      id="modal-street"
                      type="text"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="123 Main St"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-city" className="block text-xs font-semibold text-slate-700 mb-1">
                      City
                    </label>
                    <input
                      id="modal-city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Oklahoma City"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-zip" className="block text-xs font-semibold text-slate-700 mb-1">
                      ZIP Code
                    </label>
                    <input
                      id="modal-zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="73135"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Legal Certifications */}
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
                    <strong className="text-slate-800">Age Certification (21+):</strong> I certify under penalty of law that I am at least 21 years of age and authorized to purchase regulated merchandise on behalf of this business entity.
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
                    <strong className="text-slate-800">Resale Tax Exemption:</strong> All products purchased through this wholesale account are intended for commercial resale and comply with Oklahoma Sales Tax Exemption guidelines.
                  </span>
                </label>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-end gap-3">
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
                  className="w-full sm:w-auto px-6 py-2.5 bg-[#F97316] hover:bg-[#ea580c] disabled:opacity-50 text-white text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    <>Submit Wholesale Application</>
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
