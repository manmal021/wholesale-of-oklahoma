import React, { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Navigation, CornerDownRight, Copy, Check, MessageSquare, ShieldCheck } from 'lucide-react';

const getOKCDate = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour12: false,
    weekday: 'long',
    hour: 'numeric',
    minute: 'numeric',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric'
  });
  
  const parts = formatter.formatToParts(now);
  const val = (type: string) => parts.find(p => p.type === type)?.value || '';
  const hourVal = parseInt(val('hour'));
  
  return {
    dayOfWeek: now.toLocaleDateString('en-US', { timeZone: 'America/Chicago', weekday: 'long' }),
    hour: hourVal === 24 ? 0 : hourVal,
    minute: parseInt(val('minute')),
    displayTime: now.toLocaleTimeString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', minute: '2-digit' })
  };
};

const checkStoreStatus = (dayOfWeek: string, hour: number, minute: number) => {
  const isSunday = dayOfWeek === 'Sunday';
  const openHour = isSunday ? 11 : 9;
  const closeHour = 20; // 8 PM
  
  const currentMinutes = hour * 60 + minute;
  const openMinutes = openHour * 60;
  const closeMinutes = closeHour * 60;
  
  const isOpen = currentMinutes >= openMinutes && currentMinutes < closeMinutes;
  
  let nextOpenMsg = '';
  if (!isOpen) {
    if (currentMinutes < openMinutes) {
      nextOpenMsg = `Opens at ${openHour}:00 AM Today`;
    } else {
      const tomorrowSunday = dayOfWeek === 'Saturday';
      const tomorrowOpenHour = tomorrowSunday ? 11 : 9;
      nextOpenMsg = `Opens at ${tomorrowOpenHour}:00 AM Tomorrow`;
    }
  } else {
    const minutesToClose = closeMinutes - currentMinutes;
    if (minutesToClose <= 60) {
      nextOpenMsg = `Closes soon • ${minutesToClose} min left`;
    } else {
      nextOpenMsg = `Closes at 8:00 PM`;
    }
  }
  
  return { isOpen, nextOpenMsg, hoursToday: `${openHour}:00 AM – 8:00 PM` };
};

export default function StoreDetails() {
  const [timeInfo, setTimeInfo] = useState(getOKCDate());
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeInfo(getOKCDate());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  const { isOpen, nextOpenMsg, hoursToday } = checkStoreStatus(timeInfo.dayOfWeek, timeInfo.hour, timeInfo.minute);

  const copyAddress = () => {
    navigator.clipboard.writeText('4500 S Bryant Ave, Oklahoma City, OK 73135');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section id="pricing" className="py-16 md:py-24 bg-[#0B0D10] text-[#F7F7F5] px-4 sm:px-6 md:px-10 border-t border-[#2A3038]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column - Wholesale Service info card */}
          <div className="lg:col-span-5 space-y-8 bg-[#15191F] text-[#F7F7F5] p-6 sm:p-10 rounded-[32px] border border-[#2A3038] shadow-xl relative overflow-hidden">
            <div className="absolute top-[-20%] right-[-10%] w-[180px] h-[180px] rounded-full bg-[#FF6B00] opacity-15 blur-[70px] pointer-events-none" />
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF6B00] block mb-2">Our Wholesale Mission</span>
              <h3 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#F7F7F5]">
                Reliable Oklahoma Direct Delivery
              </h3>
              <p className="mt-3 text-[#B8BDC5] text-xs sm:text-sm leading-relaxed">
                Wholesale of Oklahoma streamlines smoke shop and dispensary supply loops. With zero-hassle local pickup in OKC or express dispatch directly to your front counter, we handle bulk logistics for Geekbar, Raz, Foger, Vozol, and other top-circulating brands.
              </p>
            </div>

            <div className="space-y-4 pt-4 border-t border-[#2A3038]">
              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1B2027] flex items-center justify-center shrink-0 border border-[#2A3038]">
                  <span className="text-[11px] font-bold text-[#FF6B00]">01</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F7F7F5]">Direct Shop Delivery</h4>
                  <p className="text-[11px] text-[#858C96]">Fast, reliable delivery straight to your storefront anywhere in the OKC metro area.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1B2027] flex items-center justify-center shrink-0 border border-[#2A3038]">
                  <span className="text-[11px] font-bold text-[#FF6B00]">02</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F7F7F5]">Same-Day Local Pickup</h4>
                  <p className="text-[11px] text-[#858C96]">Drive up to S Bryant Ave for express loading stack setups.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[#1B2027] flex items-center justify-center shrink-0 border border-[#2A3038]">
                  <span className="text-[11px] font-bold text-[#FF6B00]">03</span>
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#F7F7F5]">Flexible Payments</h4>
                  <p className="text-[11px] text-[#858C96]">Easy checkout and delivery verification directly with live dispatchers.</p>
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col gap-2">
              <a
                href="#direct-order-section"
                className="w-full py-3.5 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs uppercase tracking-wider text-center rounded-xl transition-all shadow-md block"
              >
                Go to Order Now Section
              </a>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-[#858C96] justify-center">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              <span>Licensed Distribution System · OKC Match</span>
            </div>
          </div>

          {/* Right Column - Map and Address Info Card */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-1.5 bg-[#FF6B00]/10 text-[#FF6B00] border border-[#FF6B00]/30 text-xs font-semibold px-3 py-1 rounded-full transition-all">
                <CornerDownRight className="w-3.5 h-3.5" />
                CENTRAL OKLAHOMA CITY HEADQUARTERS
              </div>
              <h3 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#F7F7F5] leading-none">
                Visit our Warehouse
              </h3>
              <p className="text-[#B8BDC5] max-w-xl text-xs sm:text-sm leading-relaxed">
                Located right on S Bryant Ave, catering to immediate pick-up restocks, inventory stacking help, and bulk shipping departures with complete loading docks.
              </p>
            </div>

            {/* Simulated Geographic Location Vector Map */}
            <div className="relative w-full h-64 bg-[#15191F] rounded-[32px] border border-[#2A3038] overflow-hidden flex items-center justify-center shadow-xs">
              
              {/* Abstract decorative SVG vector */}
              <svg className="absolute inset-0 w-full h-full text-slate-800 opacity-60" xmlns="http://www.w3.org/2000/svg">
                <g stroke="#2A3038" strokeWidth="4">
                  <line x1="0" y1="50" x2="100%" y2="50" />
                  <line x1="0" y1="120" x2="100%" y2="120" />
                  <line x1="0" y1="200" x2="100%" y2="200" />
                  <line x1="120" y1="0" x2="120" y2="100%" strokeWidth="6" stroke="#353C46" />
                  <line x1="320" y1="0" x2="320" y2="100%" strokeWidth="8" stroke="#FF6B00" strokeOpacity="0.35" />
                  <line x1="560" y1="0" x2="560" y2="100%" />
                </g>
                <circle cx="320" cy="120" r="16" fill="#FF6B00" fillOpacity="0.3" className="animate-ping" />
                <circle cx="320" cy="120" r="8" fill="#FF6B00" />
              </svg>

              {/* Map floating banner */}
              <div className="absolute top-4 left-4 bg-[#0B0D10] text-[#F7F7F5] p-3.5 rounded-xl shadow-md max-w-sm flex items-start gap-2 border border-[#2A3038] z-10">
                <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0 mt-0.5" />
                <div className="text-xs">
                  <span className="font-bold block text-[#FF6B00]">Wholesale of Oklahoma</span>
                  <p className="text-[#B8BDC5]">4500 S Bryant Ave, OKC, OK 73135</p>
                </div>
              </div>

              {/* Direct Maps Directions Button Overlay */}
              <a
                href="https://www.google.com/maps/dir/?api=1&destination=4500+S+Bryant+Ave+Oklahoma+City+OK+73135"
                target="_blank"
                rel="noreferrer referrer"
                className="absolute bottom-4 right-4 bg-[#1B2027] hover:bg-[#2A3038] text-[#F7F7F5] py-2 px-4 rounded-full text-xs font-semibold shadow border border-[#2A3038] flex items-center gap-1.5 transition-all z-10 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5 text-[#FF6B00]" />
                Open in Google Maps
              </a>
            </div>

            {/* Information Grid Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              
              {/* Address card */}
              <div className="bg-[#15191F] p-4 rounded-[24px] border border-[#2A3038] shadow-xs relative group flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mb-2">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#858C96]">Warehouse Address</span>
                  <p className="text-xs font-bold text-[#F7F7F5] mt-1">4500 S Bryant Ave</p>
                  <p className="text-[11px] text-[#858C96]">Oklahoma City, OK 73135</p>
                </div>
                <button
                  onClick={copyAddress}
                  className="mt-3 flex items-center gap-1 text-[10px] font-bold text-[#FF6B00] hover:text-[#E85F00] self-start cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied to Clipboard</span>
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
              <div className="bg-[#15191F] p-4 rounded-[24px] border border-[#2A3038] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center">
                      <Clock className="w-4 h-4" />
                    </div>
                    {isOpen ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/15 text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Open Now
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-rose-500/15 text-rose-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-500/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        Closed
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#858C96]">Trading Hours</span>
                  <p className="text-xs font-bold text-[#F7F7F5] mt-1">
                    {nextOpenMsg}
                  </p>
                  <p className="text-[11px] text-[#858C96] mt-0.5">Today: {hoursToday}</p>
                </div>
                
                <div className="mt-3 pt-2 border-t border-[#2A3038] flex flex-col gap-1">
                  <span className="text-[10px] text-[#858C96]">
                    OKC Local Time: <span className="font-semibold text-[#F7F7F5]">{timeInfo.displayTime}</span>
                  </span>
                  <span className="inline-flex self-start bg-[#1B2027] border border-[#2A3038] text-[#FF6B00] text-[9px] font-semibold px-2 py-0.5 rounded">
                    Closes 8:00 PM nightly
                  </span>
                </div>
              </div>

              {/* Secure Phone hotline card */}
              <div className="bg-[#15191F] p-4 rounded-[24px] border border-[#2A3038] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="w-8 h-8 rounded-full bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center mb-2">
                    <Phone className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] uppercase font-bold text-[#858C96]">OKC Call Office</span>
                  <p className="text-sm font-bold text-[#F7F7F5] mt-1">(405) 768-2975</p>
                  <span className="text-[10px] text-[#858C96] block">Plus Code: CGCR+2W</span>
                </div>
                <a
                  href="tel:4057682975"
                  className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#FF6B00] hover:bg-[#E85F00] px-3 py-1.5 rounded-full transition-colors self-start shadow-sm"
                >
                  <MessageSquare className="w-3 h-3 text-white" />
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
