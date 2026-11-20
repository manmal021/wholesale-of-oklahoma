import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Building,
  User,
  Phone,
  FileText,
  Loader2,
  Star,
} from 'lucide-react';
import {
  fetchCustomerAddresses,
  addCustomerAddress,
  deleteCustomerAddress,
  setDefaultDeliveryAddress,
  type CustomerSavedAddress,
} from '../../lib/fulfillmentApi';

export default function CustomerAddresses() {
  const [addresses, setAddresses] = useState<CustomerSavedAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [recipientName, setRecipientName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [suiteUnit, setSuiteUnit] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('OK');
  const [zipCode, setZipCode] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [isDefaultDelivery, setIsDefaultDelivery] = useState(false);

  const loadAddresses = async () => {
    setIsLoading(true);
    setError('');
    try {
      const list = await fetchCustomerAddresses();
      setAddresses(list);
    } catch (err: any) {
      setError(err.message || 'Failed to load saved addresses.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await addCustomerAddress({
        recipientName,
        streetAddress,
        suiteUnit,
        city,
        state,
        zipCode,
        phone,
        deliveryInstructions,
        isDefaultDelivery,
      });

      setSuccess('Commercial delivery address saved successfully.');
      setShowAddForm(false);
      // Reset form
      setRecipientName('');
      setStreetAddress('');
      setSuiteUnit('');
      setCity('');
      setZipCode('');
      setPhone('');
      setDeliveryInstructions('');
      setIsDefaultDelivery(false);
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to save address.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (addressId: string) => {
    if (!confirm('Are you sure you want to remove this saved delivery address?')) return;
    setError('');
    try {
      await deleteCustomerAddress(addressId);
      setSuccess('Address removed.');
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to delete address.');
    }
  };

  const handleSetDefault = async (addressId: string) => {
    setError('');
    try {
      await setDefaultDeliveryAddress(addressId);
      setSuccess('Default delivery address updated.');
      await loadAddresses();
    } catch (err: any) {
      setError(err.message || 'Failed to update default address.');
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#FF6B00]" />
        <p className="text-xs text-[#858C96]">Loading your saved commercial addresses...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">Saved Commercial Delivery Addresses</h2>
          <p className="text-xs text-slate-500">Manage verified dockside and storefront delivery locations for quick checkout.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{showAddForm ? 'Cancel' : 'Add New Address'}</span>
        </button>
      </div>

      {/* Add Address Form Modal / Inline Box */}
      {showAddForm && (
        <form onSubmit={handleAddAddress} className="bg-white rounded-2xl p-5 sm:p-6 border border-[#FF6B00]/40 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-[#FF6B00]">
            <MapPin className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">Add Authorized Delivery Address</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Recipient / Store Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder="e.g. John Smith / OKC Smoke Store"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Contact Phone <span className="text-rose-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(405) 000-0000"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Street Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={streetAddress}
                onChange={(e) => setStreetAddress(e.target.value)}
                placeholder="e.g. 1234 N Western Ave"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Suite / Unit / Bay (Optional)
              </label>
              <input
                type="text"
                value={suiteUnit}
                onChange={(e) => setSuiteUnit(e.target.value)}
                placeholder="e.g. Suite B"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                City <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Oklahoma City"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                State <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                ZIP Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value)}
                placeholder="73101"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-700 block mb-1">
                Delivery Instructions (Dock info, gate codes, unloading hours)
              </label>
              <input
                type="text"
                value={deliveryInstructions}
                onChange={(e) => setDeliveryInstructions(e.target.value)}
                placeholder="e.g. Rear commercial loading dock, ring buzzer"
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#FF6B00] focus:bg-white"
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="defaultDelivery"
                checked={isDefaultDelivery}
                onChange={(e) => setIsDefaultDelivery(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF6B00] bg-slate-50 border-slate-300 focus:ring-0 cursor-pointer"
              />
              <label htmlFor="defaultDelivery" className="text-xs text-slate-700 cursor-pointer">
                Set as my default delivery address
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              <span>Save Delivery Address</span>
            </button>
          </div>
        </form>
      )}

      {/* Address Cards Grid */}
      {addresses.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 border border-slate-200 text-center space-y-3 shadow-xs">
          <MapPin className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">No Saved Delivery Addresses</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Save your retail store or warehouse dock address for one-click delivery validation during checkout.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`bg-white rounded-2xl p-5 border transition-all space-y-3 shadow-xs ${
                addr.isDefault
                  ? 'border-[#FF6B00] ring-1 ring-[#FF6B00]/30'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-slate-900">{addr.recipientName}</h4>
                    {addr.isDefault && (
                      <span className="bg-orange-50 text-[#FF6B00] text-[9px] font-black px-2 py-0.5 rounded-full border border-orange-200 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-current" />
                        DEFAULT
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 mt-1">
                    {addr.street} {addr.unit ? `· ${addr.unit}` : ''}
                  </p>
                  <p className="text-xs text-slate-600">
                    {addr.city}, {addr.state} {addr.zip}
                  </p>
                </div>

                <button
                  onClick={() => handleDelete(addr.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 transition-colors cursor-pointer"
                  title="Remove address"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-100">
                <p><strong className="text-slate-700">Phone:</strong> {addr.phone}</p>
                {addr.deliveryInstructions && (
                  <p><strong className="text-slate-700">Instructions:</strong> {addr.deliveryInstructions}</p>
                )}
              </div>

              {!addr.isDefault && (
                <div className="pt-2">
                  <button
                    onClick={() => handleSetDefault(addr.id)}
                    className="text-[11px] font-bold text-[#FF6B00] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    Set as default delivery address
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
