import React, { useEffect, useState } from 'react';
import { ChevronDown, ExternalLink, LogOut, Search, Settings } from 'lucide-react';

interface TaxSettings {
  stateTaxRate: number;
  localTaxRate: number;
  enabled: boolean;
}

export default function AdminTaxSettings() {
  const [stateTaxRate, setStateTaxRate] = useState('4.500');
  const [localTaxRate, setLocalTaxRate] = useState('4.125');
  const [enabled, setEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('woo_session_token') || '';
    fetch('/api/admin/tax-settings', {
      headers: token ? { 'x-session-token': token } : {},
      credentials: 'same-origin',
    })
      .then(async (response) => {
        const data = await response.json();
        if (response.status === 401 || response.status === 403) {
          window.location.href = '/admin/login';
          return;
        }
        if (!response.ok) throw new Error(data.error || data.message || 'Failed to load tax settings.');
        const settings: TaxSettings = data.taxSettings;
        setStateTaxRate(settings.stateTaxRate.toFixed(3));
        setLocalTaxRate(settings.localTaxRate.toFixed(3));
        setEnabled(settings.enabled);
      })
      .catch((error) => setMessage({ type: 'error', text: error.message }));
  }, []);

  const combinedTax = (Number(stateTaxRate) || 0) + (Number(localTaxRate) || 0);

  const saveSettings = async () => {
    const nextStateTax = Number(stateTaxRate);
    const nextLocalTax = Number(localTaxRate);
    if (!Number.isFinite(nextStateTax) || nextStateTax < 0 || nextStateTax > 100 ||
        !Number.isFinite(nextLocalTax) || nextLocalTax < 0 || nextLocalTax > 100) {
      setMessage({ type: 'error', text: 'Tax rates must be between 0 and 100.' });
      return;
    }

    setIsSaving(true);
    setMessage(null);
    try {
      const token = localStorage.getItem('woo_session_token') || '';
      const response = await fetch('/api/admin/tax-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'x-session-token': token } : {}),
        },
        credentials: 'same-origin',
        body: JSON.stringify({ stateTaxRate: nextStateTax, localTaxRate: nextLocalTax, enabled }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || data.message || 'Failed to save tax settings.');
      setStateTaxRate(data.taxSettings.stateTaxRate.toFixed(3));
      setLocalTaxRate(data.taxSettings.localTaxRate.toFixed(3));
      setEnabled(data.taxSettings.enabled);
      setMessage({ type: 'success', text: 'Tax settings saved successfully.' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save tax settings.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('woo_session_token');
    localStorage.removeItem('woo_user');
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <nav className="sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 py-3"
        style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-black bg-[#FF6B00]">W</div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">Wholesale of Oklahoma</span>
            <span className="badge badge-accent">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)' }}>
            Live Site <ExternalLink className="w-3 h-3" />
          </a>
          <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg badge badge-error">
            <LogOut className="w-3.5 h-3.5" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex">
        <aside className="hidden lg:flex flex-col shrink-0 px-3 py-4"
          style={{ width: '220px', borderRight: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', minHeight: 'calc(100vh - 48px)', position: 'sticky', top: '48px', height: 'calc(100vh - 48px)' }}>
          <a href="/admin" className="saas-sidebar-item">Dashboard</a>
          <a href="/admin/customer-applications" className="saas-sidebar-item">Applications</a>
          <a href="/admin/customers" className="saas-sidebar-item">Customers</a>
          <a href="/admin/orders" className="saas-sidebar-item">Orders</a>
          <a href="/admin/products" className="saas-sidebar-item">Products</a>
          <a href="/admin/inventory-mismatches" className="saas-sidebar-item">Inventory Issues</a>
          <a href="/admin/review" className="saas-sidebar-item">
            <Search className="w-4 h-4 shrink-0" />
            <span className="flex-1">Review Portal</span>
          </a>
          <div className="pt-2">
            <button
              type="button"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((open) => !open)}
              className="saas-sidebar-item w-full"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="flex-1 text-left">Settings</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${settingsOpen ? 'rotate-180' : ''}`} />
            </button>
            {settingsOpen && (
              <a href="/admin/tax-settings" className="saas-sidebar-item active pl-8">
                <span>Tax Settings</span>
              </a>
            )}
          </div>
        </aside>

        <main className="flex-1 min-w-0 px-4 sm:px-8 py-6">
          <div className="mb-5">
            <h1 className="text-2xl font-black tracking-tight">Tax Settings</h1>
          </div>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm border ${message.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
              {message.text}
            </div>
          )}

          <section className="max-w-3xl rounded-2xl border bg-white p-5 sm:p-6" style={{ borderColor: 'var(--border-subtle)' }}>
            <p className="text-xs text-slate-500 mt-1">Configure sales tax rates applied to eligible products during checkout.</p>

            <div className="mt-6">
              <h3 className="text-sm font-black">Sales Tax Configuration</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <label className="text-xs font-bold text-slate-600">
                  State Tax (%)
                  <input type="number" min="0" max="100" step="0.001" value={stateTaxRate}
                    onChange={(event) => setStateTaxRate(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900" />
                </label>
                <label className="text-xs font-bold text-slate-600">
                  Local Tax (%)
                  <input type="number" min="0" max="100" step="0.001" value={localTaxRate}
                    onChange={(event) => setLocalTaxRate(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900" />
                </label>
              </div>

              <div className="mt-5">
                <p className="text-xs font-bold text-slate-600">Combined Sales Tax</p>
                <p className="text-2xl font-black text-emerald-700 mt-1">{combinedTax.toFixed(3)}%</p>
                <p className="text-[11px] text-slate-500">State Tax ({(Number(stateTaxRate) || 0).toFixed(3)}%) + Local Tax ({(Number(localTaxRate) || 0).toFixed(3)}%)</p>
              </div>

              <div className="mt-5 border-t pt-5" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h3 className="text-sm font-black">Tax Application</h3>
                    <p className="text-xs text-slate-500 mt-1">Apply tax to eligible products.</p>
                  </div>
                  <button type="button" role="switch" aria-checked={enabled}
                    onClick={() => setEnabled((current) => !current)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              <div className="mt-5 flex justify-end">
                <button type="button" onClick={saveSettings} disabled={isSaving}
                  className="rounded-lg bg-[#FF6B00] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
                  {isSaving ? 'Saving...' : 'Save Tax Settings'}
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
