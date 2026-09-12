import React, { useState } from 'react';
import {
  X,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Eye,
  EyeOff,
  Sliders,
  Radio,
  Server,
  Link,
  ShieldCheck,
  Check,
} from 'lucide-react';
import type { AdminInventorySettings, ZohoSyncStatus, QuantityDisplayMode } from '../../types/inventory';
import { triggerZohoSync, updateAdminSettings } from '../../lib/inventoryApi';

interface InventoryAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  syncStatus: ZohoSyncStatus;
  settings: AdminInventorySettings;
  onSettingsUpdated: (settings: AdminInventorySettings) => void;
  onSyncCompleted: (newStatus: ZohoSyncStatus) => void;
}

export const InventoryAdminModal: React.FC<InventoryAdminModalProps> = ({
  isOpen,
  onClose,
  syncStatus,
  settings,
  onSettingsUpdated,
  onSyncCompleted,
}) => {
  const [syncing, setSyncing] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveMsg, setSaveMsg] = useState(false);

  // Local copy of settings for editing
  const [displayMode, setDisplayMode] = useState<QuantityDisplayMode>(settings.display_mode);
  const [hideOutOfStock, setHideOutOfStock] = useState<boolean>(settings.hide_out_of_stock);
  const [threshold, setThreshold] = useState<number>(settings.low_stock_threshold);

  if (!isOpen) return null;

  const handleSyncNow = async () => {
    setSyncing(true);
    try {
      const res = await triggerZohoSync();
      if (res.success) {
        onSyncCompleted(res.sync_status);
      }
    } catch (err: any) {
      alert(`Sync failed: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      const res = await updateAdminSettings({
        display_mode: displayMode,
        hide_out_of_stock: hideOutOfStock,
        low_stock_threshold: threshold,
      });
      if (res.success) {
        onSettingsUpdated(res.settings);
        setSaveMsg(true);
        setTimeout(() => setSaveMsg(false), 2500);
      }
    } catch (err: any) {
      alert(`Failed to save settings: ${err.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  const getStatusBadge = () => {
    switch (syncStatus.connection_status) {
      case 'connected':
        return (
          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Zoho Live API Connected
          </span>
        );
      case 'syncing':
        return (
          <span className="inline-flex items-center gap-1.5 bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold px-3 py-1 rounded-full">
            <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
            Synchronizing...
          </span>
        );
      case 'auth_error':
        return (
          <span className="inline-flex items-center gap-1.5 bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold px-3 py-1 rounded-full">
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            Zoho API Auth Error (Using Safe Fallback)
          </span>
        );
      case 'demo_mode':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 bg-blue-100 text-blue-800 border border-blue-300 text-xs font-bold px-3 py-1 rounded-full">
            <Database className="w-3.5 h-3.5 text-blue-600" />
            Zoho Integration Ready (Catalog Cached)
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-[#0f172A]/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Container */}
      <div className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl border border-slate-200 overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="bg-[#0f172A] text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#F97316]/20 flex items-center justify-center text-[#F97316] border border-[#F97316]/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold">Zoho Inventory Admin Controls</h2>
              <p className="text-xs text-slate-400">
                Manage live synchronization, visibility policies, and webhook routing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
          {/* Status & Sync Now Panel */}
          <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                  Zoho API Connection
                </span>
                {getStatusBadge()}
              </div>

              <button
                type="button"
                onClick={handleSyncNow}
                disabled={syncing}
                className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-5 py-2.5 rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-white ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Connecting to Zoho...' : 'Sync Now with Zoho'}
              </button>
            </div>

            {/* Sync Diagnostic Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-200 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Synced Items</span>
                <span className="text-base font-black text-[#0f172A]">
                  {syncStatus.total_items_synced}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-semibold">Sync Errors</span>
                <span className="text-base font-black text-[#0f172A]">
                  {syncStatus.items_with_errors}
                </span>
              </div>
              <div className="bg-white p-3 rounded-xl border border-slate-200 col-span-2">
                <span className="text-[10px] text-slate-400 block font-semibold">Last Successful Sync</span>
                <span className="text-xs font-bold text-slate-700">
                  {syncStatus.last_sync_time
                    ? new Date(syncStatus.last_sync_time).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })
                    : 'Awaiting first sync'}
                </span>
              </div>
            </div>
          </div>

          {/* Configuration Settings */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#0f172A] uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#F97316]" />
              Inventory Display Policy
            </h3>

            {/* 1. Exact Quantity vs Stock Status */}
            <div className="space-y-2 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <label className="text-xs font-bold text-[#0f172A] block">
                Customer Stock Visibility:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDisplayMode('status_only')}
                  className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                    displayMode === 'status_only'
                      ? 'border-[#F97316] bg-orange-50/50 text-[#0f172A] ring-1 ring-[#F97316]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Stock Status Only
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Displays "In Stock / Low Stock / Out of Stock" without exposing inventory count.
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setDisplayMode('exact_quantity')}
                  className={`p-3 rounded-xl text-left border text-xs font-semibold transition-all cursor-pointer ${
                    displayMode === 'exact_quantity'
                      ? 'border-[#F97316] bg-orange-50/50 text-[#0f172A] ring-1 ring-[#F97316]'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Exact Available Quantity
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Displays exact units in warehouse (e.g. "50 in stock in OKC").
                  </span>
                </button>
              </div>
            </div>

            {/* 2. Out of stock visibility toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div>
                <span className="text-xs font-bold text-[#0f172A] block">
                  Out-of-Stock Products Visibility
                </span>
                <span className="text-[11px] text-slate-500">
                  When enabled, products with zero stock remain visible with disabled ordering.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setHideOutOfStock(!hideOutOfStock)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  hideOutOfStock ? 'bg-[#F97316]' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    hideOutOfStock ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* 3. Low Stock Alert Threshold */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#0f172A]">
                  Low Stock Threshold Warning
                </span>
                <span className="text-xs font-bold text-[#F97316] bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  {threshold} units or fewer
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-[#F97316] cursor-pointer"
              />
              <span className="text-[10px] text-slate-400 block">
                Items with available inventory at or below this number trigger the 🟡 Low Stock indicator.
              </span>
            </div>
          </div>

          {/* Zoho API Credentials Form (Direct Connection) */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#0f172A] uppercase tracking-wider flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 text-[#F97316]" />
                Live Zoho API Credentials
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">
                Stored securely on backend / .env
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Zoho Client ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 1000.XXXXXXXXXX"
                  id="zoho-client-id"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f172A] focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Zoho Client Secret
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  id="zoho-client-secret"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f172A] focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Zoho Refresh Token
                </label>
                <input
                  type="password"
                  placeholder="1000.XXXXX.XXXXX"
                  id="zoho-refresh-token"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f172A] focus:outline-none focus:border-[#F97316]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">
                  Zoho Organization ID
                </label>
                <input
                  type="text"
                  placeholder="e.g. 800000000"
                  id="zoho-org-id"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-[#0f172A] focus:outline-none focus:border-[#F97316]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[10px] text-slate-500">
                You can also enter these directly in your <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">.env</code> file.
              </span>
              <button
                type="button"
                onClick={async () => {
                  const clientId = (document.getElementById('zoho-client-id') as HTMLInputElement)?.value;
                  const clientSecret = (document.getElementById('zoho-client-secret') as HTMLInputElement)?.value;
                  const refreshToken = (document.getElementById('zoho-refresh-token') as HTMLInputElement)?.value;
                  const organizationId = (document.getElementById('zoho-org-id') as HTMLInputElement)?.value;

                  if (!clientId || !clientSecret || !refreshToken || !organizationId) {
                    alert('Please fill out all 4 Zoho API fields (Client ID, Secret, Refresh Token, and Org ID).');
                    return;
                  }

                  try {
                    const res = await fetch('/api/inventory/zoho-config', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ clientId, clientSecret, refreshToken, organizationId, dc: 'com' }),
                    });
                    const data = await res.json();
                    if (data.success) {
                      alert('Zoho API credentials saved! Testing synchronization now...');
                      handleSyncNow();
                    } else {
                      alert(`Error: ${data.error}`);
                    }
                  } catch (e: any) {
                    alert(`Failed to save: ${e.message}`);
                  }
                }}
                className="bg-[#0f172A] hover:bg-[#1e293b] text-white text-[11px] font-bold px-4 py-2 rounded-full transition-colors cursor-pointer border border-slate-700"
              >
                Save &amp; Connect Live Zoho
              </button>
            </div>
          </div>

          {/* Zoho Automation Webhook Helper */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-2 text-xs border border-slate-800">
            <div className="flex items-center gap-2 text-[#F97316] font-bold">
              <Link className="w-3.5 h-3.5" />
              <span>Zoho Inventory Automation Webhook Endpoint</span>
            </div>
            <p className="text-slate-400 text-[11px]">
              Configure in Zoho Inventory &gt; Settings &gt; Automation &gt; Webhooks to push stock updates instantly:
            </p>
            <div className="bg-black/60 p-2.5 rounded-lg font-mono text-[11px] text-orange-400 break-all select-all border border-slate-800">
              https://wholesaleofoklahoma.com/api/inventory/webhook
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-4 px-6 flex items-center justify-between border-t border-slate-200">
          <span className="text-xs text-slate-500">
            {saveMsg && (
              <span className="text-emerald-700 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Settings saved successfully!
              </span>
            )}
          </span>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="bg-[#F97316] hover:bg-[#ea580c] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-colors cursor-pointer shadow-sm disabled:opacity-50"
            >
              {savingSettings ? 'Saving...' : 'Apply Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
