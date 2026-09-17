import React from 'react';
import {
  DollarSign,
  MapPin,
  PackageCheck,
  Truck,
  Headphones,
  FileCheck2,
  ArrowRight,
  ShieldCheck,
  Building2,
  Clock,
} from 'lucide-react';

const ADVANTAGES = [
  {
    icon: DollarSign,
    title: 'Competitive Wholesale Pricing',
    description:
      'Direct-from-factory master carton pricing designed to maximize retail margins for convenience stores, dispensaries, and Wholesale of Oklahoma retail partners.',
  },
  {
    icon: MapPin,
    title: 'Local Oklahoma Service',
    description:
      'Centrally located on S Bryant Ave in Oklahoma City. Convenient dockside pickup, direct truck loading assistance, and rapid local logistics.',
  },
  {
    icon: PackageCheck,
    title: 'Leading Product Selection',
    description:
      'Comprehensive inventory of top-selling disposable vapes, premium hardware, replacement coils, glassware, and counter retail essentials.',
  },
  {
    icon: Truck,
    title: 'Reliable Fulfillment',
    description:
      'Same-day order processing for in-stock inventory. Consistent supply chains help keep your shelves stocked during peak retail demand.',
  },
  {
    icon: Headphones,
    title: 'Dedicated Retailer Support',
    description:
      'Direct phone and warehouse support from experienced wholesale account managers who understand the Oklahoma retail market.',
  },
  {
    icon: FileCheck2,
    title: 'Easy Wholesale Ordering',
    description:
      'Streamlined account application, straightforward compliance verification, and fast batch ordering through our digital catalog portal.',
  },
];

interface WhyChooseUsProps {
  onOpenApplication: () => void;
}

export const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ onOpenApplication }) => {
  return (
    <div className="space-y-0">
      {/* Why Wholesale of Oklahoma Section */}
      <section id="why-us" className="py-20 bg-[#F8FAFC] text-slate-900 border-t border-slate-200 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 bg-white border border-slate-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-3.5 py-1.5 rounded-full mb-3 shadow-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Retail Partner Advantages</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight">
              Why Retailers Choose <span className="text-[#FF6B00]">Wholesale of Oklahoma</span>
            </h2>
            <p className="mt-4 text-slate-600 text-base sm:text-lg leading-relaxed">
              We provide qualified Oklahoma businesses with dependable stock, factory-direct volume rates, and genuine local distribution service.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {ADVANTAGES.map((adv, idx) => {
              const Icon = adv.icon;
              return (
                <div
                  key={idx}
                  className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-200 hover:border-[#FF6B00]/60 hover:shadow-lg transition-all duration-300 flex flex-col justify-between shadow-xs"
                >
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF6B00] mb-5 shadow-xs">
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">
                      {adv.title}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {adv.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Stat Banner */}
          <div className="mt-12 bg-white rounded-2xl p-6 sm:p-8 text-slate-900 flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-200 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center text-[#FF6B00] shrink-0 border border-orange-200">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-base sm:text-lg text-slate-900">Central Oklahoma City Hub</h4>
                <p className="text-xs sm:text-sm text-slate-600">
                  4500 S Bryant Ave, Oklahoma City, OK 73135 · Open 6 Days a Week
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <a
                href="tel:4057682975"
                className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-full border border-slate-200 transition-colors"
              >
                (405) 768-2975
              </a>
              <button
                type="button"
                onClick={onOpenApplication}
                className="bg-[#FF6B00] hover:bg-[#E85F00] text-white text-xs font-bold px-5 py-2.5 rounded-full transition-all shadow-md cursor-pointer"
              >
                Apply for Account
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Wholesale Application CTA Section: "Ready to Buy Wholesale?" */}
      <section className="py-20 bg-white text-slate-900 relative overflow-hidden border-t border-b border-slate-200">
        {/* Glow effects */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#FF6B00]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-orange-50 border border-orange-200 text-[#FF6B00] text-xs font-black uppercase tracking-wider px-4 py-1.5 rounded-full shadow-xs">
            <Clock className="w-3.5 h-3.5" />
            <span>Fast Review Process · Usually Within 24-48 Hours</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mx-auto">
            Ready to Buy Wholesale?
          </h2>

          <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Apply for a wholesale account today to unlock full catalog pricing, case discounts, and dedicated retail distribution service across Oklahoma.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <button
              type="button"
              onClick={onOpenApplication}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-extrabold text-sm sm:text-base px-8 py-4 rounded-full transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 active:scale-95 flex items-center gap-2 cursor-pointer uppercase tracking-wider"
            >
              <span>Apply for Wholesale Account</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <a
              href="tel:4057682975"
              className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-sm sm:text-base px-7 py-4 rounded-full border border-slate-300 transition-all flex items-center gap-2"
            >
              <span>Speak with a Representative</span>
            </a>
          </div>

          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              Requires Sales Tax Permit / Resale ID
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              Secure Document Upload Portal
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#FF6B00]" />
              No Public Pricing Exposure
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WhyChooseUs;
