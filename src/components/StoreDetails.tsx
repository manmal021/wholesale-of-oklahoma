import React, { useState } from 'react';
import { MapPin, Phone, Clock, Navigation, CornerDownRight, Copy, Check, MessageSquare, ShieldCheck, Mail } from 'lucide-react';

export default function StoreDetails() {
  const [copied, setCopied] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMsg, setContactMsg] = useState('');

  const copyAddress = () => {
    navigator.clipboard.writeText('4500 S Bryant Ave, Oklahoma City, OK 73135');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const currentDayOfWeek = new Date().getDay(); // 0 is Sunday, 6 is Saturday
  const isSunday = currentDayOfWeek === 0;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSuccess(true);
    setTimeout(() => {
      setFormSuccess(false);
      setContactName('');
      setContactEmail('');
      setContactMsg('');
    }, 4000);
  };

  return (
    <section id="pricing" className="py-16 md:py-24 bg-[#f5f5f4] text-[#1f2a1d] px-4 sm:px-6 md:px-10 border-t border-[#1f2a1d]/5">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column - Wholesale Service info card (removing Initiate Store Restock as requested) */}
          <div className="lg:col-span-5 space-y-8 bg-[#1f2a1d] text-white p-6 sm:p-10 rounded-[32px] border border-white/10 shadow-lg relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[150px] h-[150px] rounded-full bg-[#85AB8B] opacity-15 blur-[60px]" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#85AB8B] block mb-2">Our Wholesale Mission</span>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-white">
                Reliable Oklahoma Direct Delivery
              </h3>
              <p className="mt-3 text-neutral-300 text-xs sm:text-sm leading-relaxed">
                Wholesale of Oklahoma streamlines smoke shop and dispensary supply loops. With zero-hassle local pickup in OKC or express dispatch directly to your front counter, we handle bulk logistics for Geekbar, Raz, Foger, Vozol, and other top-circulating brands.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#85AB8B]">01</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Bulk Delivery Match</h4>
                  <p className="text-[11px] text-neutral-300">Minimum 50 units total gets gratis OKC central network deliveries.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#85AB8B]">02</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Same-Day Local Pickup</h4>
                  <p className="text-[11px] text-neutral-300">Drive up to S Bryant Ave for express loading stack setups.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center shrink-0">
                  <span className="text-[11px] font-bold text-[#85AB8B]">03</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Flexible Payments</h4>
                  <p className="text-[11px] text-neutral-300">Easy checkout and delivery verification directly with live dispatchers.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <a
                href="#direct-order-section"
                className="w-full py-3.5 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] font-bold text-xs uppercase tracking-wider text-center rounded-xl transition-all shadow-md block"
              >
                Go to Order Now Section
              </a>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-neutral-300 justify-center">
              <ShieldCheck className="w-4 h-4 text-[#85AB8B]" />
              <span>Licensed Distribution System · OKC Match</span>
            </div>
          </div>

          {/* Right Column - Map and Address Info Card */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-[#1f2a1d]/5 hover:bg-[#1f2a1d]/10 text-[#3d5638] text-xs font-semibold px-3 py-1 rounded-full transition-all">
                <CornerDownRight className="w-3.5 h-3.5" />
                CENTRAL OKLAHOMACITY HEADQUARTERS
              </div>
              <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1f2a1d] leading-none">
                Visit our Warehouse
              </h3>
              <p className="text-[#4b5b47] max-w-xl text-xs sm:text-sm">
                Located right on S Bryant Ave, catering to immediate pick-up restocks, inventory stacking help, and bulk shipping departures with complete loading docks.
              </p>
            </div>

            {/* Simulated Geographic Location Vector Map with Editorial Sizing and Corners */}
            <div className="relative w-full h-64 bg-white/50 backdrop-blur-md rounded-[32px] border border-white overflow-hidden flex items-center justify-center shadow-sm">
              
              {/* Abstract decorative SVG vector representing roads near S Bryant Ave */}
              <svg className="absolute inset-0 w-full h-full text-neutral-300 opacity-60" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#ffffff" strokeWidth="4">
                  <line x1="0" y1="50" x2="100%" y2="50" />
                  <line x1="0" y1="120" x2="100%" y2="120" />
                  <line x1="0" y1="200" x2="100%" y2="200" />
                  <line x1="120" y1="0" x2="120" y2="100%" strokeWidth="6" stroke="#e5e5e5" />
                  <line x1="320" y1="0" x2="320" y2="100%" strokeWidth="8" stroke="#336443" strokeOpacity="0.15" />
                  <line x1="560" y1="0" x2="560" y2="100%" />
                </g>
                <circle cx="320" cy="120" r="16" fill="#85AB8B" fillOpacity="0.3" className="animate-ping" />
                <circle cx="320" cy="120" r="8" fill="#336443" />
              </svg>

              {/* Map floating banner */}
              <div className="absolute top-4 left-4 bg-[#1f2a1d] text-white p-3.5 rounded-xl shadow-md max-w-sm flex items-start gap-2 border border-white/10 z-10">
                <MapPin className="w-4 h-4 text-[#85AB8B] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block text-[#85AB8B]">Wholesale of Oklahoma</span>
                  <p className="text-neutral-300">4500 S Bryant Ave, OKC, OK 73135</p>
                </div>
              </div>

              {/* Direct Maps Directions Button Overlay */}
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=4500+S+Bryant+Ave+Oklahoma+City+OK+73135"
                target="_blank"
                rel="noreferrer referrer"
                className="absolute bottom-4 right-4 bg-white hover:bg-neutral-50 text-[#1f2a1d] py-2 px-4 rounded-full text-xs font-semibold shadow border border-neutral-200 flex items-center gap-1.5 transition-all z-10 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#336443]" />
                Open in Google Maps
              </a>
            </div>

            {/* Information Grid Cards with Editorial Aesthetic */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Address card */}
              <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white shadow-sm relative group flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1f2a1d]/5 text-[#336443] flex items-center justify-center mb-2">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Warehouse Address</span>
                  <p className="text-xs font-bold text-[#1f2a1d] mt-1">4500 S Bryant Ave</p>
                  <p className="text-[11px] text-neutral-500">Oklahoma City, OK 73135</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#336443] hover:text-[#2d3a2a] self-start cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-600" />
                      <span className="text-emerald-600">Copied to Clipboard</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy Address URL</span>
                    </>
                  )}
                </button>
              </div>

              {/* Operating hours card */}
              <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1f2a1d]/5 text-[#336443] flex items-center justify-center mb-2">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">Trading Hours</span>
                  <p className="text-xs font-bold text-[#1f2a1d] mt-1">
                    {isSunday ? 'Opens 11 AM · Closes 8 PM' : 'Closes soon · 8:00 PM'}
                  </p>
                  <p className="text-[11px] text-neutral-500">Opens 11 AM Sun</p>
                </div>
                <span className="mt-3 inline-flex self-start bg-amber-50 border border-amber-100 text-[#3d5638] text-[10px] font-semibold px-2 py-0.5 rounded">
                  Closes 8:00 PM nightly
                </span>
              </div>

              {/* Secure Phone hotline card */}
              <div className="bg-white/60 backdrop-blur-md p-4 rounded-[24px] border border-white shadow-sm flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#1f2a1d]/5 text-[#336443] flex items-center justify-center mb-2">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-neutral-400">OKC Call Office</span>
                  <p className="text-sm font-bold text-[#1f2a1d] mt-1">(405) 768-2975</p>
                  <span className="text-[10px] text-neutral-400 block">Plus Code: CGCR+2W</span>
                </div>
                <a
                  href="tel:4057682975"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#1f2a1d] hover:bg-[#2d3a2a] px-3 py-1.5 rounded-full transition-colors self-start"
                >
                  <MessageSquare className="w-3 h-3" />
                  Call Live Agent
                </a>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
