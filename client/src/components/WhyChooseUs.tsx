import React from 'react';
import { ArrowRight, ShieldCheck, MapPin, PackageCheck, Zap } from 'lucide-react';

interface WhyChooseUsProps {
  onOpenApplication: () => void;
}

export const WhyChooseUs: React.FC<WhyChooseUsProps> = ({ onOpenApplication }) => {
  return (
    <div className="bg-white border-y border-slate-200">
      {/* Editorial Horizontal Split */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-24 items-start">
          
          {/* Left: Sticky Headline & CTA */}
          <div className="lg:col-span-5 lg:sticky lg:top-32 space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 text-[#FF6B00] text-xs font-black uppercase tracking-wider mb-4">
                <ShieldCheck className="w-4 h-4" />
                <span>The Wholesale Advantage</span>
              </div>
              <h2 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                Built for Oklahoma <span className="text-slate-400">Retailers.</span>
              </h2>
            </div>
            
            <p className="text-lg text-slate-600 font-medium">
              We provide qualified Oklahoma businesses with dependable stock, factory-direct volume rates, and genuine local distribution service.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={onOpenApplication}
                className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-black px-6 py-4 rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>Apply for Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="tel:4057682975"
                className="bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold px-6 py-4 rounded-full border border-slate-200 transition-colors flex items-center justify-center text-center"
              >
                Call (405) 768-2975
              </a>
            </div>
          </div>

          {/* Right: Editorial Stats & Facts */}
          <div className="lg:col-span-7 space-y-12">
            
            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Central OKC Hub</h3>
                <p className="text-slate-600 leading-relaxed">
                  Located on S Bryant Ave in Oklahoma City. Convenient dockside pickup, direct truck loading assistance, and rapid local logistics for statewide dispatch.
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <PackageCheck className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Factory-Direct Supply</h3>
                <p className="text-slate-600 leading-relaxed">
                  Authentic inventory from top manufacturers like Geek Bar, VOZOL, and Foger. Every master carton includes scratch-off QR verifications.
                </p>
              </div>
            </div>

            <div className="w-full h-px bg-slate-100" />

            <div className="flex gap-6">
              <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center shrink-0">
                <Zap className="w-5 h-5 text-[#FF6B00]" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">Volume Master Pricing</h3>
                <p className="text-slate-600 leading-relaxed">
                  Access live tier pricing built to maximize margins for convenience stores, dispensaries, and retail partners. Log in to view full inventory case rates.
                </p>
              </div>
            </div>

          </div>

        </div>
      </section>
    </div>
  );
};

export default WhyChooseUs;
