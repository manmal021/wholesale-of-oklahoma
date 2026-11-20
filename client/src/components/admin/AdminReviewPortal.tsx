/**
 * AdminReviewPortal.tsx
 *
 * Dedicated Admin Review Portal — Three-panel interface:
 *  1. Pending queue sidebar
 *  2. Full applicant detail viewer
 *  3. Approve (shows plain-text credentials + all data) / Deny (deletes record)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ClipboardList,
  CheckCircle2,
  XCircle,
  User,
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  RefreshCw,
  Loader2,
  AlertTriangle,
  Key,
  Copy,
  ChevronRight,
  LogOut,
  Eye,
  EyeOff,
  Trash2,
  Globe,
  Hash,
  CreditCard,
  CheckSquare,
} from 'lucide-react';

interface ApplicationSummary {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'NEEDS_INFORMATION';
  submittedAt: string;
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
  address: { street: string; city: string; state: string; zip: string };
  website?: string;
  notes?: string;
  ageCertified: boolean;
  taxExemptCertified: boolean;
  status: string;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  documents?: Array<{ documentId?: string; documentType?: string; filename: string }>;
}

interface ApprovalResult {
  customer: any;
  application: ApplicationData;
  credentials: {
    username: string;
    password: string;
    welcomeMessage?: string;
  };
}

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? (localStorage.getItem('woo_session_token') || '') : '';
  return token
    ? { 'x-session-token': token, 'Content-Type': 'application/json' }
    : { 'Content-Type': 'application/json' };
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; dot: string; label: string }> = {
    PENDING:           { bg: 'bg-amber-50 border border-amber-200',       text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'Pending Review' },
    NEEDS_INFORMATION: { bg: 'bg-blue-50 border border-blue-200',         text: 'text-blue-700',    dot: 'bg-blue-500',    label: 'Needs Information' },
    APPROVED:          { bg: 'bg-emerald-50 border border-emerald-200',   text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'Approved' },
    REJECTED:          { bg: 'bg-red-50 border border-red-200',           text: 'text-red-700',     dot: 'bg-red-500',     label: 'Rejected' },
    SUSPENDED:         { bg: 'bg-slate-100 border border-slate-200',      text: 'text-slate-600',   dot: 'bg-slate-400',   label: 'Suspended' },
  };
  const s = map[status] || map['PENDING'];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value?: string | boolean }) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icon className="w-4 h-4 text-slate-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wide mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 font-medium break-words">
          {typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : value}
        </p>
      </div>
    </div>
  );
}

export default function AdminReviewPortal() {
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ApplicationData | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');

  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [denyReason, setDenyReason] = useState('');
  const [showDenyConfirm, setShowDenyConfirm] = useState(false);
  const [approvalResult, setApprovalResult] = useState<ApprovalResult | null>(null);
  const [showPassword, setShowPassword] = useState(true);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setIsLoadingList(true);
    try {
      const res = await fetch('/api/admin/applications', { headers: getAuthHeaders() });
      if (res.status === 401 || res.status === 403) {
        window.location.href = '/admin/login';
        return;
      }
      const data = await res.json();
      const list: ApplicationSummary[] = (data.applications || data.records || []).map((a: any) => ({
        id: a.id,
        businessName: a.businessName || 'Unknown Business',
        contactName: a.contactName || `${a.contactFirstName || ''} ${a.contactLastName || ''}`.trim(),
        email: a.email,
        status: a.status,
        submittedAt: a.submittedAt,
      }));
      setApplications(list);
    } catch {
      // silent
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  const fetchDetail = useCallback(async (id: string) => {
    setIsLoadingDetail(true);
    setDetail(null);
    setApprovalResult(null);
    setActionError(null);
    setShowDenyConfirm(false);
    setDenyReason('');
    try {
      const res = await fetch(`/api/admin/applications/${id}`, { headers: getAuthHeaders() });
      const data = await res.json();
      setDetail(data.application || null);
    } catch {
      setDetail(null);
    } finally {
      setIsLoadingDetail(false);
    }
  }, []);

  useEffect(() => { fetchApplications(); }, [fetchApplications]);
  useEffect(() => { if (selectedId) fetchDetail(selectedId); }, [selectedId, fetchDetail]);

  const handleApprove = async () => {
    if (!detail) return;
    setIsApproving(true);
    setActionError(null);
    try {
      const res = await fetch(`/api/admin/applications/${detail.id}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'Approval failed');
      setApprovalResult({
        customer: data.customer,
        application: data.application || detail,
        credentials: data.credentials || {
          username: data.customer?.email || detail.email,
          password: data.assignedPassword || '',
        },
      });
      fetchApplications();
      fetchDetail(detail.id);
    } catch (e: any) {
      setActionError(e.message || 'Approval failed. Please try again.');
    } finally {
      setIsApproving(false);
    }
  };

  const handleDeny = async () => {
    if (!detail) return;
    setIsDenying(true);
    setActionError(null);
    try {
      await fetch(`/api/admin/applications/${detail.id}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: denyReason || 'Application denied by admin review' }),
      });
      // Hard delete — permanently removes customer record per requirements
      await fetch(`/api/admin/applications/${detail.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      setSelectedId(null);
      setDetail(null);
      setShowDenyConfirm(false);
      setDenyReason('');
      fetchApplications();
    } catch (e: any) {
      setActionError(e.message || 'Denial failed. Please try again.');
    } finally {
      setIsDenying(false);
    }
  };

  const handleCopy = (value: string, key: string) => {
    try {
      navigator.clipboard.writeText(value);
      setCopiedField(key);
      setTimeout(() => setCopiedField(null), 2200);
    } catch {}
  };

  const filtered = applications.filter((a) =>
    statusFilter === 'ALL' ? true : a.status === statusFilter
  );
  const pendingCount = applications.filter((a) => a.status === 'PENDING').length;

  const buildPlainTextRecord = (app: ApplicationData, creds: { username: string; password: string }) => [
    '=== APPROVED CUSTOMER RECORD ===',
    `Application ID : ${app.id}`,
    'Status         : APPROVED',
    '',
    '--- BUSINESS INFO ---',
    `Business Name  : ${app.businessName}`,
    app.dba ? `DBA            : ${app.dba}` : null,
    `Business Type  : ${app.businessType}`,
    `FEIN / Tax ID  : ${app.fein}`,
    `License #      : ${app.licenseNumber || 'N/A'}`,
    `Website        : ${app.website || 'N/A'}`,
    '',
    '--- CONTACT INFO ---',
    `Contact Name   : ${app.contactName}`,
    `Email          : ${app.email}`,
    `Phone          : ${app.phone}`,
    '',
    '--- ADDRESS ---',
    `Street         : ${app.address?.street || ''}`,
    `City           : ${app.address?.city || ''}`,
    `State          : ${app.address?.state || ''}`,
    `ZIP            : ${app.address?.zip || ''}`,
    '',
    '--- CERTIFICATIONS ---',
    `Age Certified      : ${app.ageCertified ? 'YES' : 'NO'}`,
    `Tax Exempt Cert    : ${app.taxExemptCertified ? 'YES' : 'NO'}`,
    '',
    '--- UPLOADED DOCUMENTS ---',
    (app.documents && app.documents.length > 0)
      ? app.documents.map((d, i) => `[${i + 1}] ${d.documentType || d.filename}`).join('\n')
      : 'No documents uploaded',
    '',
    '--- LOGIN CREDENTIALS ---',
    `Username (Email) : ${creds.username}`,
    `Password         : ${creds.password}`,
    '',
    '--- NOTES ---',
    app.notes || 'None',
  ].filter((l) => l !== null).join('\n');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Nav */}
      <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#FF6B00] to-[#E85F00] flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900 leading-tight">Admin Review Portal</h1>
            <p className="text-xs text-slate-500">Wholesale of Oklahoma</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {pendingCount > 0 && (
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-700 border border-amber-200 animate-pulse">
              {pendingCount} Pending
            </span>
          )}
          <a
            href="/admin/dashboard"
            className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1 transition-colors"
          >
            Full Dashboard
            <ChevronRight className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={() => {
              localStorage.removeItem('woo_session_token');
              localStorage.removeItem('woo_user');
              window.location.href = '/admin/login';
            }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </nav>

      <div className="flex flex-1" style={{ height: 'calc(100vh - 57px)' }}>
        {/* ── LEFT SIDEBAR ── */}
        <aside className="w-80 bg-white border-r border-slate-200 flex flex-col flex-shrink-0 overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-[#FF6B00]" />
                Applications
              </h2>
              <button
                onClick={fetchApplications}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                title="Refresh list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-0.5 p-1 bg-slate-100 rounded-lg">
              {(['PENDING', 'APPROVED', 'REJECTED', 'ALL'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`py-1 px-1 rounded-md text-xs font-semibold transition-all ${
                    statusFilter === f ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f === 'ALL' ? 'All' : f === 'PENDING' ? `Pend${pendingCount > 0 ? ` (${pendingCount})` : ''}` : f === 'APPROVED' ? 'Done' : 'Denied'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoadingList ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 animate-spin text-[#FF6B00]" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-6 text-center">
                <ClipboardList className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 font-medium">
                  No {statusFilter !== 'ALL' ? statusFilter.toLowerCase() : ''} applications
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filtered.map((app) => (
                  <button
                    key={app.id}
                    onClick={() => setSelectedId(app.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      selectedId === app.id
                        ? 'bg-orange-50 border-orange-200 shadow-sm'
                        : 'border-transparent hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <p className="text-sm font-semibold text-slate-900 leading-tight truncate">{app.businessName}</p>
                      <StatusBadge status={app.status} />
                    </div>
                    <p className="text-xs text-slate-500 truncate mb-1">{app.contactName}</p>
                    <p className="text-xs text-slate-400 truncate">{app.email}</p>
                    <p className="text-xs text-slate-300 mt-1">
                      {new Date(app.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ── MAIN PANEL ── */}
        <main className="flex-1 overflow-y-auto">
          {!selectedId ? (
            <div className="flex items-center justify-center h-full text-center p-12">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-700 mb-2">Select an Application</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  Choose a pending application from the left to review and take action.
                </p>
              </div>
            </div>
          ) : isLoadingDetail ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-[#FF6B00]" />
            </div>
          ) : !detail ? (
            <div className="flex items-center justify-center h-full text-center p-12">
              <div>
                <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">Application not found or was deleted.</p>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto p-6 space-y-5">
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">{detail.businessName}</h2>
                  {detail.dba && <p className="text-sm text-slate-500">DBA: {detail.dba}</p>}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <StatusBadge status={detail.status} />
                    <span className="text-xs text-slate-400 font-mono">{detail.id}</span>
                    <span className="text-xs text-slate-400">
                      Submitted {new Date(detail.submittedAt).toLocaleDateString('en-US', {
                        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* ── APPROVAL RESULT (shown after successful approve) ── */}
              {approvalResult && (
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-6 shadow-md">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shadow-sm">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-emerald-800">Application Approved</h3>
                      <p className="text-sm text-emerald-600">Wholesale account activated — credentials assigned</p>
                    </div>
                  </div>

                  {/* Credentials plain text */}
                  <div className="bg-white border border-emerald-200 rounded-xl p-5 mb-4">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Key className="w-3.5 h-3.5 text-emerald-600" />
                      Login Credentials — Plain Text
                    </p>
                    <div className="space-y-2.5">
                      {[
                        { label: 'Username / Email', value: approvalResult.credentials.username, key: 'username' },
                        { label: 'Password', value: approvalResult.credentials.password, key: 'password', isPassword: true },
                      ].map(({ label, value, key, isPassword }) => (
                        <div key={key} className="flex items-center justify-between gap-4 py-2.5 px-3 bg-slate-50 rounded-lg border border-slate-100">
                          <div className="min-w-0">
                            <span className="text-xs text-slate-400 block mb-0.5">{label}</span>
                            <span className="text-slate-900 font-bold font-mono tracking-widest select-all text-sm">
                              {isPassword && !showPassword ? '••••••••••' : value}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {isPassword && (
                              <button
                                onClick={() => setShowPassword(!showPassword)}
                                className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all"
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            )}
                            <button
                              onClick={() => handleCopy(value, key)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-700 transition-all"
                            >
                              {copiedField === key ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Full plain-text record */}
                  <div className="bg-white border border-emerald-200 rounded-xl p-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                      Complete Customer Record — Plain Text
                    </p>
                    <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 rounded-lg p-4 border border-slate-100 select-all overflow-x-auto max-h-96">
                      {buildPlainTextRecord(approvalResult.application, approvalResult.credentials)}
                    </pre>
                    <button
                      onClick={() => handleCopy(buildPlainTextRecord(approvalResult.application, approvalResult.credentials), 'full-record')}
                      className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                    >
                      {copiedField === 'full-record' ? (
                        <><CheckCircle2 className="w-3.5 h-3.5" /> Copied!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copy Full Record</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── APPLICANT DETAIL CARDS (hidden once approved to keep focus on result) ── */}
              {!approvalResult && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <Building2 className="w-3.5 h-3.5" /> Business Information
                      </h3>
                      <InfoRow icon={Building2} label="Business Name" value={detail.businessName} />
                      {detail.dba ? <InfoRow icon={Building2} label="DBA" value={detail.dba} /> : null}
                      <InfoRow icon={Hash} label="Business Type" value={detail.businessType?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())} />
                      <InfoRow icon={CreditCard} label="FEIN / Tax ID" value={detail.fein} />
                      <InfoRow icon={FileText} label="License / Resale #" value={detail.licenseNumber} />
                      <InfoRow icon={Globe} label="Website" value={detail.website} />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <User className="w-3.5 h-3.5" /> Contact & Location
                      </h3>
                      <InfoRow icon={User} label="Contact Name" value={detail.contactName} />
                      <InfoRow icon={Mail} label="Email" value={detail.email} />
                      <InfoRow icon={Phone} label="Phone" value={detail.phone} />
                      <InfoRow icon={MapPin} label="Street" value={detail.address?.street} />
                      <InfoRow icon={MapPin} label="City, State ZIP" value={`${detail.address?.city || ''}, ${detail.address?.state || ''} ${detail.address?.zip || ''}`} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5" /> Certifications
                      </h3>
                      <InfoRow icon={CheckSquare} label="Age 21+ Certified" value={detail.ageCertified} />
                      <InfoRow icon={CheckSquare} label="Tax Exempt Certified" value={detail.taxExemptCertified} />
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Uploaded Documents
                      </h3>
                      {detail.documents && detail.documents.length > 0 ? (
                        <div className="space-y-2">
                          {detail.documents.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 py-2 px-3 bg-slate-50 rounded-lg border border-slate-100">
                              <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-700 truncate">{doc.filename}</p>
                                {doc.documentType && <p className="text-xs text-slate-400">{doc.documentType}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic">No documents uploaded</p>
                      )}
                    </div>
                  </div>

                  {detail.notes && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5" /> Applicant Notes
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{detail.notes}</p>
                    </div>
                  )}

                  {actionError && (
                    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                      <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{actionError}</span>
                    </div>
                  )}

                  {/* ── ACTION AREA ── */}
                  {detail.status === 'PENDING' && (
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
                      <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
                        Review Decision
                      </h3>
                      <p className="text-xs text-slate-500 mb-5 leading-relaxed">
                        <strong className="text-emerald-600">Approve</strong> to activate this wholesale account and generate login credentials shown in plain text.{' '}
                        <strong className="text-red-600">Deny</strong> to permanently delete this application and all associated records from the system.
                      </p>

                      {!showDenyConfirm ? (
                        <div className="flex gap-3">
                          <button
                            id="btn-approve-application"
                            onClick={handleApprove}
                            disabled={isApproving}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold text-sm transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isApproving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                            {isApproving ? 'Approving...' : 'Approve Application'}
                          </button>
                          <button
                            id="btn-deny-application"
                            onClick={() => setShowDenyConfirm(true)}
                            className="flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-bold text-sm transition-all shadow-sm"
                          >
                            <XCircle className="w-4 h-4" />
                            Deny & Delete Record
                          </button>
                        </div>
                      ) : (
                        <div className="border-2 border-red-300 bg-red-50 rounded-xl p-5 space-y-3">
                          <div className="flex items-center gap-2 text-red-700">
                            <Trash2 className="w-4 h-4" />
                            <p className="text-sm font-bold">Confirm Denial — Cannot Be Undone</p>
                          </div>
                          <p className="text-xs text-red-600 leading-relaxed">
                            Denying will <strong>permanently delete</strong> this application and all customer records from the system.
                            The applicant will be notified by email that their request was declined.
                          </p>
                          <textarea
                            value={denyReason}
                            onChange={(e) => setDenyReason(e.target.value)}
                            placeholder="Reason for denial (recommended for your records)..."
                            rows={2}
                            className="w-full text-sm border border-red-200 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-red-400 bg-white resize-none text-slate-800 placeholder:text-slate-400"
                          />
                          <div className="flex gap-2">
                            <button
                              id="btn-confirm-deny"
                              onClick={handleDeny}
                              disabled={isDenying}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-all disabled:opacity-60"
                            >
                              {isDenying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                              {isDenying ? 'Deleting Record...' : 'Yes, Deny & Delete'}
                            </button>
                            <button
                              onClick={() => setShowDenyConfirm(false)}
                              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-medium transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {detail.status !== 'PENDING' && (
                    <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
                      detail.status === 'APPROVED'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {detail.status === 'APPROVED'
                        ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                        : <XCircle className="w-5 h-5 flex-shrink-0" />}
                      <div>
                        <p className="text-sm font-semibold">
                          {detail.status === 'APPROVED' ? 'Account already approved' : `Application ${detail.status.toLowerCase()}`}
                        </p>
                        {detail.reviewedAt && (
                          <p className="text-xs opacity-75 mt-0.5">
                            Reviewed {new Date(detail.reviewedAt).toLocaleDateString()}
                            {detail.reviewedBy ? ` by ${detail.reviewedBy}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
