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
  X,
  Copy,
  Key,
  Eye,
  EyeOff,
  Send
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
  assignedPassword?: string;
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
  const [actionError, setActionError] = useState<string | null>(null);

  // Modal dialog states
  const [confirmApproveOpen, setConfirmApproveOpen] = useState(false);
  const [confirmRejectOpen, setConfirmRejectOpen] = useState(false);
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false);
  const [confirmReactivateOpen, setConfirmReactivateOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [suspendReason, setSuspendReason] = useState('');
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Credentials & Password state
  const [assignedCredentials, setAssignedCredentials] = useState<{
    username: string;
    password: string;
    welcomeMessage?: string;
  } | null>(null);
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [isSendingCredentials, setIsSendingCredentials] = useState(false);

  const handleCopy = (text: string, key: string) => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch (_) {}
  };

  const fetchDetail = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const authHeader: Record<string, string> = token ? { 'x-session-token': token } : {};

      const res = await fetch(`/api/admin/applications/${applicationId}`, {
        headers: authHeader,
        credentials: 'same-origin',
      });
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

      if (data.credentials) {
        setAssignedCredentials(data.credentials);
      } else if (data.assignedPassword || data.application.assignedPassword || data.customer?.temporaryPassword) {
        const pwd = data.assignedPassword || data.application.assignedPassword || data.customer?.temporaryPassword;
        const email = data.application.email || data.customer?.email;
        setAssignedCredentials({
          username: email,
          password: pwd,
          welcomeMessage: `Welcome to Wholesale of Oklahoma!\nYour wholesale purchasing account for "${data.application.businessName}" has been approved.\n\nLogin Credentials:\nUsername: ${email}\nPassword: ${pwd}\n\nSign in here: https://www.wholesaleofoklahoma.com/account/login`,
        });
      }
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
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${applicationId}/approve`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to approve application.');
      }
      setConfirmApproveOpen(false);
      setActionError(null);
      if (data.credentials) {
        setAssignedCredentials(data.credentials);
        setCredentialsModalOpen(true);
      }
      setActionSuccess(`ACCOUNT APPROVED! Random 10-character password assigned for ${data.customer?.email || app?.email}.`);
      fetchDetail();
    } catch (err: any) {
      setActionError(err.message || 'Approval failed.');
      setErrorMessage(err.message || 'Approval failed.');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleResetPassword = async () => {
    if (!confirm('Generate a new random 10-character password for this customer?')) return;
    setIsResettingPassword(true);
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${applicationId}/reset-password`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to reset password.');
      if (data.credentials) {
        setAssignedCredentials(data.credentials);
        setCredentialsModalOpen(true);
      }
      setActionSuccess('New 10-character password generated successfully!');
      fetchDetail();
    } catch (err: any) {
      setActionError(err.message || 'Password generation failed.');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleSendCredentials = async () => {
    setIsSendingCredentials(true);
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${applicationId}/send-credentials`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to dispatch credentials email.');
      setActionSuccess(`Login credentials successfully emailed to ${app?.email}.`);
    } catch (err: any) {
      setActionError(err.message || 'Email dispatch failed.');
    } finally {
      setIsSendingCredentials(false);
    }
  };

  const handleReject = async () => {
    setIsProcessingAction(true);
    setErrorMessage(null);
    setActionError(null);
    try {
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/applications/${applicationId}/reject`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
        body: JSON.stringify({ reason: rejectReason || 'Application declined by compliance review' }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || data.error || 'Failed to reject application.');
      }
      setConfirmRejectOpen(false);
      setActionError(null);
      setActionSuccess(`Application ${applicationId} has been declined.`);
      fetchDetail();
    } catch (err: any) {
      setActionError(err.message || 'Rejection failed.');
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
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/customers/${targetCustId}/suspend`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
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
      const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
      const headers: Record<string, string> = {
        ...(token ? { 'x-session-token': token } : {}),
      };

      const res = await fetch(`/api/admin/customers/${targetCustId}/reactivate`, {
        method: 'POST',
        headers,
        credentials: 'same-origin',
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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Top Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <a
            href="/admin/customer-applications"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors"
            title="Back to applications list"
          >
            <ArrowLeft className="w-4 h-4" />
          </a>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900">
                {app ? app.businessName : 'Application Details'}
              </h1>
              <span className="font-mono text-xs text-slate-500">({applicationId})</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Wholesale of Oklahoma • Compliance & Approval Desk
            </p>
          </div>
        </div>

        <button
          onClick={fetchDetail}
          disabled={isLoading}
          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 transition-colors cursor-pointer"
          title="Refresh application"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </nav>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        {actionSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00] mx-auto" />
            <p className="text-xs text-slate-500">Loading application details...</p>
          </div>
        ) : !app ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center space-y-3 shadow-xs">
            <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">Application Not Found</h3>
            <p className="text-xs text-slate-500">The application reference {applicationId} does not exist.</p>
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
            <div className="p-6 rounded-3xl bg-white border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Current Account Status</span>
                <div className="flex items-center gap-3">
                  <span
                    className={`text-sm font-black uppercase tracking-widest px-4 py-1 rounded-full border ${
                      app.status === 'PENDING'
                        ? 'bg-amber-50 border-amber-200 text-amber-700'
                        : app.status === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : app.status === 'SUSPENDED'
                        ? 'bg-purple-50 border-purple-200 text-purple-700'
                        : 'bg-rose-50 border-rose-200 text-rose-700'
                    }`}
                  >
                    {app.status}
                  </span>
                  <span className="text-xs text-slate-500">Submitted: {new Date(app.submittedAt).toLocaleString()}</span>
                </div>
              </div>

              {app.reviewedAt && (
                <div className="text-xs text-slate-500 sm:text-right">
                  <span>Reviewed: {new Date(app.reviewedAt).toLocaleString()}</span>
                  {app.reviewedBy && <div className="text-[11px] text-slate-400">Reviewer: {app.reviewedBy}</div>}
                </div>
              )}
            </div>

            {/* Application Data Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Business Info Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Business Entity
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Legal Name:</span>
                    <span className="text-sm font-bold text-slate-900">{app.businessName}</span>
                  </div>
                  {app.dba && (
                    <div>
                      <span className="text-slate-500 block">DBA / Trade Name:</span>
                      <span className="text-slate-800 font-medium">{app.dba}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-slate-500 block">Business Type:</span>
                    <span className="text-slate-800 capitalize font-medium">{app.businessType.replace(/_/g, ' ')}</span>
                  </div>
                  {app.website && (
                    <div>
                      <span className="text-slate-500 block">Website:</span>
                      <a href={app.website} target="_blank" rel="noopener noreferrer" className="text-[#FF6B00] hover:underline">
                        {app.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Authorized Contact Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Authorized Contact
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Representative Name:</span>
                    <span className="text-sm font-bold text-slate-900">{app.contactName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Business Email:</span>
                    <a href={`mailto:${app.email}`} className="text-[#FF6B00] hover:underline font-mono">
                      {app.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Phone:</span>
                    <span className="text-slate-800 font-mono">{app.phone}</span>
                  </div>
                </div>
              </div>

              {/* Physical Location Card */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Physical Business Address
                </h3>

                <div className="space-y-2 text-xs">
                  <span className="text-slate-900 font-medium block text-sm">{app.address?.street}</span>
                  <span className="text-slate-700 block">
                    {app.address?.city}, {app.address?.state} {app.address?.zip}
                  </span>
                  <span className="text-slate-500 block pt-1">Commercial delivery territory: OK</span>
                </div>
              </div>

              {/* Tax Identification & Permits */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tax ID & Compliance Licenses
                </h3>

                <div className="space-y-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">FEIN / Tax ID:</span>
                    <span className="text-sm font-mono font-bold text-slate-900">{app.fein}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Resale Permit / Tobacco License:</span>
                    <span className="text-slate-800 font-mono font-medium">
                      {app.licenseNumber || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 pt-1">
                    <span className={`inline-flex items-center gap-1 font-bold ${app.ageCertified ? 'text-emerald-700' : 'text-rose-600'}`}>
                      {app.ageCertified ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      21+ Age Certified
                    </span>
                    <span className={`inline-flex items-center gap-1 font-bold ${app.taxExemptCertified ? 'text-emerald-700' : 'text-slate-500'}`}>
                      {app.taxExemptCertified ? <Check className="w-3.5 h-3.5" /> : null}
                      {app.taxExemptCertified ? 'Tax-Exempt Certified' : 'Standard Resale'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes & Documents */}
            {(app.notes || (app.documents && app.documents.length > 0)) && (
              <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-xs">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#FF6B00]">
                  Attached Documentation & Inquiries
                </h3>

                {app.notes && (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                    <span className="text-slate-500 block font-bold mb-1">Applicant Notes:</span>
                    <p className="leading-relaxed">{app.notes}</p>
                  </div>
                )}

                {app.documents && app.documents.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-slate-500 font-bold block">Uploaded Permits / Certificates:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {app.documents.map((doc, i) => {
                        const docId = doc.documentId || doc.id;
                        return (
                          <div
                            key={i}
                            className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-900 block truncate">{doc.filename}</span>
                              <span className="text-[11px] text-slate-500 capitalize">
                                {(doc.documentType || doc.type || 'Document').replace(/_/g, ' ')}
                              </span>
                            </div>
                            {docId && (
                              <a
                                href={`/api/wholesale/documents/${docId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-lg bg-white hover:bg-slate-200 text-[#FF6B00] border border-slate-200 transition-colors cursor-pointer"
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

            {/* ASSIGNED ACCESS CREDENTIALS CARD */}
            {app.status === 'APPROVED' && (
              <div className="bg-gradient-to-r from-emerald-950/90 via-slate-900 to-indigo-950/90 border border-emerald-500/30 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
                
                <div className="relative z-10 flex flex-col md:flex-row md:items-start justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          Customer Login & Access Credentials
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold tracking-wide border border-emerald-500/30 uppercase">
                            Active Account
                          </span>
                        </h3>
                        <p className="text-xs text-slate-300">
                          These credentials allow the customer to sign in to the portal and shop at wholesale pricing.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCredentialsModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold tracking-wide border border-white/15 transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      Full Credentials View
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPassword}
                      disabled={isResettingPassword}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold tracking-wide border border-amber-500/30 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                      title="Generate a new 10-digit secure password"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isResettingPassword ? 'animate-spin' : ''}`} />
                      {isResettingPassword ? 'Regenerating...' : 'Regenerate'}
                    </button>
                    <button
                      type="button"
                      onClick={handleSendCredentials}
                      disabled={isSendingCredentials}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold tracking-wide transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {isSendingCredentials ? 'Sending...' : 'Email Credentials'}
                    </button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Username Field */}
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Login Username (Email)
                      </span>
                      <span className="font-mono text-sm text-white font-medium truncate block select-all">
                        {app.email}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy(app.email, 'email')}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors shrink-0 cursor-pointer"
                      title="Copy Username"
                    >
                      {copiedKey === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Password Field */}
                  <div className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Assigned 10-Digit Password
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-sm font-bold tracking-wider text-emerald-400 truncate">
                          {showPassword 
                            ? (assignedCredentials?.password || app.assignedPassword || '••••••••••') 
                            : '••••••••••'}
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">
                          (Upper, Lower, Number, Symbol)
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        title={showPassword ? 'Hide Password' : 'Show Password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const pwd = assignedCredentials?.password || app.assignedPassword;
                          if (pwd) handleCopy(pwd, 'password');
                        }}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                        title="Copy Password"
                      >
                        {copiedKey === 'password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Manual Sharing helper */}
                <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-300">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>Admin manual delivery: You can send these credentials directly via email, SMS, or copy the welcome script.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const pwd = assignedCredentials?.password || app.assignedPassword || '';
                      const msg = `Hello ${app.contactName || app.businessName},\n\nYour Wholesale of Oklahoma account has been approved!\n\nYou can now log in at https://www.wholesaleofoklahoma.com with:\nUsername: ${app.email}\nPassword: ${pwd}\n\nOnce logged in, wholesale pricing and ordering will be unlocked.\n\nThank you,\nWholesale of Oklahoma`;
                      handleCopy(msg, 'message');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-emerald-300 border border-emerald-500/20 text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'message' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedKey === 'message' ? 'Message Copied!' : 'Copy Welcome Message'}
                  </button>
                </div>
              </div>
            )}

            {/* ACTION TOOLBAR */}
            <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-wrap items-center justify-between gap-4 shadow-xs">
              <div className="text-xs text-slate-500">
                Administrator actions execute server-side verification and trigger transactional customer notifications.
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {(app.status === 'PENDING' || app.status === 'REJECTED') && (
                  <button
                    onClick={() => {
                      setActionError(null);
                      setConfirmApproveOpen(true);
                    }}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    {app.status === 'REJECTED' ? 'Re-Approve Account' : 'Approve Account'}
                  </button>
                )}

                {app.status === 'PENDING' && (
                  <button
                    onClick={() => {
                      setActionError(null);
                      setConfirmRejectOpen(true);
                    }}
                    className="px-5 py-2.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Reject Application
                  </button>
                )}

                {app.status === 'APPROVED' && (
                  <button
                    onClick={() => setConfirmSuspendOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
                  >
                    <Ban className="w-4 h-4" />
                    Suspend Account
                  </button>
                )}

                {app.status === 'SUSPENDED' && (
                  <button
                    onClick={() => setConfirmReactivateOpen(true)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-slate-900 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Approve this wholesale customer?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Approving <strong>{app?.businessName}</strong> will promote their account status to <strong>APPROVED</strong>, provision their wholesale purchasing profile, generate a single-use 48-hour activation token, and dispatch an activation email to <strong>{app?.email}</strong>.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {actionError}
              </div>
            )}

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmApproveOpen(false);
                }}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-slate-900 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-200">
              <XCircle className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Reject Application?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Are you sure you want to decline the wholesale application for <strong>{app?.businessName}</strong>? A notification will be dispatched to the applicant.
              </p>
            </div>

            {actionError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Internal Review Note <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incomplete OTC resale documentation"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionError(null);
                  setConfirmRejectOpen(false);
                }}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={isProcessingAction}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-2 cursor-pointer"
              >
                {isProcessingAction ? 'Rejecting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION MODAL: SUSPEND */}
      {confirmSuspendOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-slate-900 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-200">
              <Ban className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Suspend Wholesale Customer?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Suspending this account will immediately revoke all wholesale shopping access, block checkout, and reject active API sessions.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Suspension Reason <span className="text-slate-400">(Optional)</span>
              </label>
              <input
                type="text"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="e.g. Expired tobacco license"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmSuspendOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-md w-full text-slate-900 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-900">Reactivate Wholesale Account?</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reactivating <strong>{app?.businessName}</strong> will restore full wholesale shopping access, active pricing, and checkout privileges.
              </p>
            </div>

            <div className="flex items-center gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setConfirmReactivateOpen(false)}
                disabled={isProcessingAction}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
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

      {/* CREDENTIALS DIALOG MODAL */}
      {credentialsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 sm:p-8 max-w-lg w-full text-white space-y-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setCredentialsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Customer Access Credentials</h3>
                <p className="text-xs text-slate-400">
                  Approved account credentials for {app?.businessName}
                </p>
              </div>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-4 text-xs text-emerald-200 space-y-1">
              <div className="font-semibold text-emerald-300 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Account Approved & Portal Access Enabled
              </div>
              <p className="text-slate-300">
                The customer can now log in at <strong>wholesaleofoklahoma.com</strong> using their email address and the assigned 10-digit password below.
              </p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Username (Email)</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-sm text-white font-medium select-all">{app?.email}</span>
                  <button
                    type="button"
                    onClick={() => app?.email && handleCopy(app.email, 'modal_email')}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                  >
                    {copiedKey === 'modal_email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Assigned 10-Digit Password (Upper, Lower, Number, Symbol)
                </span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-base font-bold tracking-wider text-emerald-400 select-all">
                    {assignedCredentials?.password || app?.assignedPassword || '••••••••••'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        const pwd = assignedCredentials?.password || app?.assignedPassword;
                        if (pwd) handleCopy(pwd, 'modal_password');
                      }}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                    >
                      {copiedKey === 'modal_password' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button
                type="button"
                onClick={handleSendCredentials}
                disabled={isSendingCredentials}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isSendingCredentials ? 'Sending Email...' : 'Email to Customer'}
              </button>
              <button
                type="button"
                onClick={() => setCredentialsModalOpen(false)}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs tracking-wider transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
