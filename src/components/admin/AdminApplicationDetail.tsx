import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ShieldCheck,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
  RefreshCw,
  Loader2,
  AlertCircle,
  Download,
  Check,
  X
} from 'lucide-react';

interface ApplicationDetailProps {
  applicationId: string;
}

interface ApplicationData {
  id: string;
  businessName: string;
  dba?: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactName: string;
  email: string;
  phone: string;
  fein: string;
  licenseNumber?: string;
  businessType: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  website?: string;
  notes?: string;
  ageCertified: boolean;
  taxExemptCertified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewNotes?: string;
  customerId?: string;
  documents?: Array<{
    id?: string;
    documentId?: string;
    type?: string;
    documentType?: string;
    filename: string;
  }>;
}

export default function AdminApplicationDetail({ applicationId }: ApplicationDetailProps) {
  const [app, setApp] = useState<ApplicationData | null>(null);
  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modal dialog states
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  const fetchDetail = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}`);
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }

      const data = await res.json();
      if (!res.ok || !data.application) {
        throw new Error(data.error || 'Application not found');
      }

      setApp(data.application);
      if (data.customer) setCustomer(data.customer);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load application.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [applicationId]);

  const handleApprove = async () => {
    setIsProcessingAction(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/approve`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to approve application.');
      }
      setConfirmApproveOpen(false);
      setActionSuccess(`ACCOUNT APPROVED! Activation invitation dispatched to ${data.customer?.email || app?.email}.`);
      fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Approval failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReject = async () => {
    setIsProcessingAction(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/applications/${applicationId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to reject application.');
      }
      setConfirmRejectOpen(false);
      setActionSuccess(`Application ${applicationId} has been rejected.`);
      fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Rejection failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleSuspend = async () => {
    if (!app?.customerId && !customer?.id) return;
    const targetCustId = customer?.id || app?.customerId;
    setIsProcessingAction(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/customers/${targetCustId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: suspendReason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to suspend account.');
      setConfirmSuspendOpen(false);
      setActionSuccess(`Wholesale account ${targetCustId} suspended.`);
      fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Suspension failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleReactivate = async () => {
    if (!app?.customerId && !customer?.id) return;
    const targetCustId = customer?.id || app?.customerId;
    setIsProcessingAction(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/customers/${targetCustId}/reactivate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Failed to reactivate account.');
      setConfirmReactivateOpen(false);
      setActionSuccess(`Wholesale account ${targetCustId} reactivated.`);
      fetchDetail();
    } catch (err: any) {
      setErrorMessage(err.message || 'Reactivation failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0D10] text-[#F7F7F5]">
      {/* Top Navbar */}
      <nav className="bg-[#15191F] border-b border-[#2A3038] sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a
            href="/admin/customer-applications"
            className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#B8BDC5] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors"
            title="Back to applications list"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-[#F7F7F5]">
                {app ? app.businessName : 'Application Details'}
              </h1>
              <span className="font-mono text-xs text-[#858C96]">({applicationId})</span>
            </div>
            <p className="text-[11px] text-[#858C96]">
              Wholesale of Oklahoma • Compliance & Approval Desk
            </p>
          </div>
        </div>

        <button
          onClick={fetchDetail}
          disabled={isLoading}
          className="p-2 rounded-xl bg-[#1B2027] hover:bg-[#2A3038] text-[#858C96] hover:text-[#F7F7F5] border border-[#2A3038] transition-colors cursor-pointer"
          title="Refresh application"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-sm flex items-center gap-2.5 animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-400 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
            <p className="text-xs text-[#858C96]">Loading application details...</p>
          </div>
        ) : !app ? (
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto" />
            <h3 className="text-base font-bold text-[#F7F7F5]">Application Not Found</h3>
            <p className="text-xs text-[#858C96]">The application reference {applicationId} does not exist.</p>
            <div className="pt-2">
              <a
                href="/admin/customer-applications"
                className="inline-block px-4 py-2 rounded-xl bg-[#FF6B00] text-white text-xs font-bold"
              >
                Back to Applications
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Header Banner */}
            <div className="p-6 rounded-3xl bg-[#15191F] border border-[#2A3038] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-[#858C96]">Current Account Status</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-black uppercase tracking-widest px-4 py-1 rounded-full border ${
                      app.status === 'PENDING'
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                        : app.status === 'APPROVED'
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                        : app.status === 'SUSPENDED'
                        ? 'bg-purple-500/15 border-purple-500/40 text-purple-400'
                        : 'bg-red-500/15 border-red-500/40 text-red-400'
                    }`}
                  >
                    {app.status}
                  </span>
                  <span className="text-xs text-[#858C96]">Submitted: {new Date(app.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              {app.reviewedAt && (
                <div className="text-xs text-[#858C96] sm:text-right">
                  <span>Reviewed: {new Date(app.reviewedAt).toLocaleString()}</span>
                  {app.reviewedBy && <div className="text-[11px] text-[#626871]">Reviewer: {app.reviewedBy}</div>}
                </div>
              )}
            </div>

            {/* Application Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Info Card */}
              <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Entity
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#858C96] block">Legal Name:</span>
                    <span className="text-sm font-bold text-[#F7F7F5]">{app.businessName}</span>
                  </div>
                  {app.dba && (
                    <div>
                      <span className="text-[#858C96] block">DBA / Trade Name:</span>
                      <span className="text-[#F7F7F5] font-medium">{app.dba}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-[#858C96] block">Business Type:</span>
                    <span className="text-[#F7F7F5] capitalize font-medium">{app.businessType.replace(/_/g, ' ')}</span>
                  </div>
                  {app.website && (
                    <div>
                      <span className="text-[#858C96] block">Website:</span>
                      <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:underline">
                        {app.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized Contact Card */}
              <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Authorized Contact
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#858C96] block">Representative Name:</span>
                    <span className="text-sm font-bold text-[#F7F7F5]">{app.contactName}</span>
                  </div>
                  <div>
                    <span className="text-[#858C96] block">Business Email:</span>
                    <a href={`mailto:${app.email}`} className="text-[#FF6B00] hover:underline font-mono">
                      {app.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-[#858C96] block">Phone:</span>
                    <span className="text-[#F7F7F5] font-mono">{app.phone}</span>
                  </div>
                </div>
              </div>

              {/* Physical Location Card */}
              <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Physical Business Address
                </h3>

                <div className="space-y-2 text-xs">
                  <span className="text-[#F7F7F5] font-medium block text-sm">{app.address?.street}</span>
                  <span className="text-[#B8BDC5] block">
                    {app.address?.city}, {app.address?.state} {app.address?.zip}
                  </span>
                  <span className="text-[#858C96] block pt-1">Commercial delivery territory: OK</span>
                </div>
              </div>

              {/* Tax Identification & Permits */}
              <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tax ID & Compliance Licenses
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-[#858C96] block">FEIN / Tax ID:</span>
                    <span className="text-sm font-mono font-bold text-[#F7F7F5]">{app.fein}</span>
                  </div>
                  <div>
                    <span className="text-[#858C96] block">Resale Permit / Tobacco License:</span>
                    <span className="text-[#F7F7F5] font-mono font-medium">
                      {app.licenseNumber || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <span className={`inline-flex items-center gap-1 font-bold ${app.ageCertified ? 'text-emerald-400' : 'text-red-400'}`}>
                      {app.ageCertified ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      21+ Age Certified
                    </span>
                    <span className={`inline-flex items-center gap-1 font-bold ${app.taxExemptCertified ? 'text-emerald-400' : 'text-[#858C96]'}`}>
                      {app.taxExemptCertified ? <Check className="w-3.5 h-3.5" /> : null}
                      {app.taxExemptCertified ? 'Tax-Exempt Certified' : 'Standard Resale'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Documents */}
            {(app.notes || (app.documents && app.documents.length > 0)) && (
              <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00]">
                  Attached Documentation & Inquiries
                </h3>

                {app.notes && (
                  <div className="p-4 rounded-xl bg-[#1B2027] border border-[#2A3038] text-xs text-[#B8BDC5]">
                    <span className="text-[#858C96] block font-bold mb-1">Applicant Notes:</span>
                    <p className="leading-relaxed">{app.notes}</p>
                  </div>
                )}

                {app.documents && app.documents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-[#858C96] font-bold block">Uploaded Permits / Certificates:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {app.documents.map((doc, i) => {
                        const docId = doc.documentId || doc.id;
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-[#1B2027] border border-[#2A3038] flex items-center justify-between text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-[#F7F7F5] block truncate">{doc.filename}</span>
                              <span className="text-[11px] text-[#858C96] capitalize">
                                {(doc.documentType || doc.type || 'Document').replace(/_/g, ' ')}
                              </span>
                            </div>
                            {docId && (
                              <a
                                href={`/api/wholesale/documents/${docId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-[#15191F] hover:bg-[#2A3038] text-[#FF6B00] transition-colors cursor-pointer"
                                title="Download Document"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ACTION TOOLBAR */}
            <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4">
              <div className="text-xs text-[#858C96]">
                Administrator actions execute server-side verification and trigger transactional customer notifications.
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {app.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => setConfirmRejectOpen(true)}
                      className="px-5 py-2.5 rounded-xl border border-red-500/30 hover:bg-red-500/10 text-red-400 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      Reject Application
                    </button>
                    <button
                      onClick={() => setConfirmApproveOpen(true)}
                      className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-lg shadow-emerald-600/25 flex items-center gap-2 cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve Account
                    </button>
                  </>
                )}

                {app.status === 'APPROVED' && (
                  <button
                    onClick={() => setConfirmSuspendOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend Account
                  </button>
                )}

                {app.status === 'SUSPENDED' && (
                  <button
                    onClick={() => setConfirmReactivateOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Reactivate Account
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL: APPROVE */}
      {confirmApproveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D10]/85 backdrop-blur-sm">
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#F7F7F5] space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F7F7F5]">Approve this wholesale customer?</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed">
                Approving <strong>{app?.businessName}</strong> will promote their account status to <strong>APPROVED</strong>, provision their wholesale purchasing profile, generate a single-use 48-hour activation token, and dispatch an activation email to <strong>{app?.email}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmApproveOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-[#2A3038] hover:bg-[#1B2027] text-xs font-semibold text-[#B8BDC5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={isProcessingAction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessingAction ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Approving...</span>
                  </>
                ) : (
                  <span>Approve Customer</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REJECT */}
      {confirmRejectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D10]/85 backdrop-blur-sm">
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#F7F7F5] space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/40">
              <XCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F7F7F5]">Reject Application?</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed">
                Are you sure you want to decline the wholesale application for <strong>{app?.businessName}</strong>? A notification will be dispatched to the applicant.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#858C96] mb-1">
                Internal Review Note <span className="text-[#626871]">(Optional)</span>
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete OTC resale documentation"
                className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmRejectOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-[#2A3038] hover:bg-[#1B2027] text-xs font-semibold text-[#B8BDC5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessingAction}
                className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessingAction ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: SUSPEND */}
      {confirmSuspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D10]/85 backdrop-blur-sm">
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#F7F7F5] space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
              <Ban className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F7F7F5]">Suspend Wholesale Customer?</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed">
                Suspending this account will immediately revoke all wholesale shopping access, block checkout, and reject active API sessions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#858C96] mb-1">
                Suspension Reason <span className="text-[#626871]">(Optional)</span>
              </label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Expired tobacco license"
                className="w-full bg-[#1B2027] border border-[#2A3038] rounded-xl px-3.5 py-2 text-xs text-[#F7F7F5] focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmSuspendOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-[#2A3038] hover:bg-[#1B2027] text-xs font-semibold text-[#B8BDC5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSuspend}
                disabled={isProcessingAction}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessingAction ? 'Suspending...' : 'Suspend Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: REACTIVATE */}
      {confirmReactivateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B0D10]/85 backdrop-blur-sm">
          <div className="bg-[#15191F] border border-[#2A3038] rounded-3xl p-6 sm:p-8 max-w-md w-full text-[#F7F7F5] space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-[#F7F7F5]">Reactivate Wholesale Account?</h3>
              <p className="text-xs text-[#B8BDC5] leading-relaxed">
                Reactivating <strong>{app?.businessName}</strong> will restore full wholesale shopping access, active pricing, and checkout privileges.
              </p>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmReactivateOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-[#2A3038] hover:bg-[#1B2027] text-xs font-semibold text-[#B8BDC5] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReactivate}
                disabled={isProcessingAction}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessingAction ? 'Reactivating...' : 'Reactivate Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
