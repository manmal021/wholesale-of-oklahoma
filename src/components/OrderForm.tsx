import React, { useState } from 'react';
import { Sparkles, Send, Check, Phone, MessageSquare, ShieldCheck, Mail, Building, User, FileText } from 'lucide-react';

export default function OrderForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');
  const [orderDetails, setOrderDetails] = useState('');

  return (
    <section id="direct-order-section" className="py-16 md:py-24 bg-[#1f2a1d] text-white px-4 sm:px-6 md:px-10 relative overflow-hidden">
      {/* Editorial aesthetic organic gradient circles */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-[#85AB8B] opacity-10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[450px] h-[450px] rounded-full bg-[#3d5638] opacity-15 blur-[110px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">

        {/* Header Block */}
        <div className="text-center space-y-4 mb-12">
          <span className="inline-flex items-center gap-1.5 bg-white/10 text-[#85AB8B] text-xs font-semibold px-4 py-1.5 rounded-full uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-[#85AB8B]" />
            Direct Restock Request
          </span>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-white leading-tight">
            Order Now
          </h2>
          <p className="text-neutral-300 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Fill out your shop and batch details below. Our central OKC dispatch staff will instantly contact you to confirm pricing, delivery channels, or S Bryant Ave pickup stack.
          </p>
        </div>

        {/* Beautiful Modern Grid Form */}
        <div className="bg-white/5 backdrop-blur-md rounded-[32px] p-6 sm:p-10 border border-white/10 shadow-2xl">
          <form action="https://api.web3forms.com/submit" method="POST" className="space-y-6">

            {/* Web3Forms Configuration */}
            <input type="hidden" name="access_key" value="1ebec85d-15fd-4f21-9513-ef05685850bc" />
            <input type="hidden" name="subject" value="New Wholesale Order Request" />
            <input type="hidden" name="from_name" value="Wholesale of Oklahoma Orders" />
            <input type="checkbox" name="botcheck" className="hidden" style={{ display: 'none' }} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Name */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-[#85AB8B]" />
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                />
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-[#85AB8B]" />
                  Business Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="Business Name"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Oklahoma City Vape Hub"
                  className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                />
              </div>

              {/* Phone number */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#85AB8B]" />
                  Phone Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  name="Phone"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. (405) 555-0199"
                  className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                />
              </div>

              {/* Email address */}
              <div className="space-y-2">
                <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#85AB8B]" />
                  Email Address <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="Email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. manager@store.com"
                  className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white placeholder-neutral-500"
                />
              </div>

            </div>

            {/* Details of orders */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold uppercase tracking-widest text-[#cbdccb] flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-[#85AB8B]" />
                Details of Orders <span className="text-red-400">*</span>
              </label>
              <textarea
                name="Order Details"
                required
                rows={4}
                value={orderDetails}
                onChange={(e) => setOrderDetails(e.target.value)}
                placeholder="e.g. 50x Geekbar Pulse 15k (Sour Apple, Watermelon Ice)..."
                className="w-full bg-[#1f2a1d]/85 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#85AB8B] transition-colors text-white resize-none placeholder-neutral-500"
              />
            </div>

            {/* Submit Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                className="flex-1 py-4 bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 shadow-lg cursor-pointer select-none"
              >
                <Send className="w-4 h-4" />
                Submit Order Request
              </button>

              {/* Live dial backup button */}
              <a
                href="tel:4057682975"
                className="sm:px-8 py-4 bg-white/10 hover:bg-white/20 text-[#85AB8B] border border-white/15 font-bold text-xs uppercase tracking-widest rounded-full transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <Phone className="w-4 h-4 text-white" />
                Call Live Desk
              </a>
            </div>

          </form>
        </div>

      </div>
    </section>
  );
}
