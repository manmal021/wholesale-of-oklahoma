import React, { useState } from 'react';
import { Star, MessageSquare, Heart, Sparkles, User, FileText, CheckCircle2 } from 'lucide-react';

interface Review {
  author: string;
  role: string;
  rating: number;
  date: string;
  body: string;
  verified: boolean;
}

export default function ReviewSlider() {
  const [reviews, setReviews] = useState<Review[]>([
    {
      author: 'Manish Malla',
      role: 'Local Guide · OKC dispensary retailer',
      rating: 5,
      date: 'a week ago',
      body: 'Excellent wholesale company with a strong product selection for dispensaries, vape stores, and gas stations. Fast communication, smooth ordering process, and dependable service every time.',
      verified: true
    },
    {
      author: 'Kathmandu guy',
      role: 'Retail Partner · Wholesale of Oklahoma',
      rating: 5,
      date: '3 weeks ago',
      body: 'The guy with long hair is very helpful & polite. He helped me to find new vapes. Also helped me on stacking in my vehicle. Great customer service.',
      verified: true
    },
    {
      author: 'Kailash Dhakal',
      role: 'Store restocker guide',
      rating: 5,
      date: '3 weeks ago',
      body: 'Staffs are friendly and helpful. Surprised me, they even do shippings, store setup and take order to bring products of your choice.',
      verified: true
    },
    {
      author: 'Munal Baniya',
      role: 'Retail Partner · Wholesale of Oklahoma',
      rating: 5,
      date: '3 weeks ago',
      body: 'Everything was great. Great customer service and friendly nature. Products were really good at price.',
      verified: true
    },
    {
      author: 'Prasish',
      role: 'Store Owner',
      rating: 5,
      date: '3 weeks ago',
      body: 'Reliable wholesale supplier with a great selection of vapes, hookahs, glass, cigars, and accessories. Competitive prices, well-stocked inventory, and helpful staff make Wholesale of Oklahoma a solid choice for retail partners and convenience stores.',
      verified: true
    },
    {
      author: 'Subash Malla',
      role: 'Convenience Store Manager',
      rating: 5,
      date: '3 weeks ago',
      body: 'Excellent wholesale supplier at Wholesale of Oklahoma for retail partners, vape stores, gas stations, and convenience stores. They have a massive variety of wholesale products including vapes, hookahs, glass pieces, rolling papers, disposables, cigars, incense, and more.',
      verified: true
    },
    {
      author: 'K R',
      role: 'Local Guide',
      rating: 5,
      date: 'a month ago',
      body: 'They have all the stuff for your retail store especially for vape stores, gas stations and dispensaries. They have all the flavors of foger, geekbar, Raz. Varieties of vapes with wide ranges of prices to choose from, variety of kratom product, varieties of novelties stuff.',
      verified: true
    },
    {
      author: 'Khem Raj Regmi',
      role: 'Retail Store Owner',
      rating: 5,
      date: 'a month ago',
      body: 'They got all the fogers flavors with good price and Geekbar with lowest price ever.',
      verified: true
    },
    {
      author: 'Ankit Dhakal',
      role: 'Retail Partner',
      rating: 5,
      date: 'a month ago',
      body: 'Wholesale of Oklahoma is a one-stop wholesale partner that truly delivers! Whether you\'re picking up stock at Wholesale of Oklahoma, browsing the wholesale showroom, or visiting the warehouse, the staff is incredibly knowledgeable, friendly, and welcoming every single time.',
      verified: true
    },
    {
      author: 'Roshani Shrestha',
      role: 'Store Owner',
      rating: 5,
      date: 'a month ago',
      body: 'Wholesale of Oklahoma is our go-to place because they truly have everything we need in one stop, with a huge, well-organized selection that’s always fully stocked and easy to shop. What really stands out is the staff—they are very friendly and helpful.',
      verified: true
    },
    {
      author: 'Shreeya Thapa',
      role: 'Retail Store Owner',
      rating: 5,
      date: 'a month ago',
      body: 'Had a great experience at Wholesale of Oklahoma. The store has a huge selection, and the staff were super friendly and helpful throughout my visit. Everything felt smooth and welcoming, definitely a place I’d recommend and come back to.',
      verified: true
    },
    {
      author: 'Sujan DH',
      role: 'Local Guide',
      rating: 5,
      date: 'a month ago',
      body: 'This is the ultimate one-stop supplier for Wholesale of Oklahoma retail partners, gas stations, and novelty stores. They offer a massive selection of smoking accessories, vapes, convenience items, and trendy novelties at competitive wholesale prices.',
      verified: true
    }
  ]);

  const [activeIdx, setActiveIdx] = useState(0);
  const [writeOpen, setWriteOpen] = useState(false);
  const [newAuthor, setNewAuthor] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newRating, setNewRating] = useState(5);
  const [submittingState, setSubmittingState] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  const handleCreateReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAuthor.trim() || !newBody.trim()) return;

    setSubmittingState(true);

    const submission: Review = {
      author: newAuthor.trim(),
      role: 'Verified Wholesaler Partner',
      rating: newRating,
      date: 'Just now',
      body: newBody.trim(),
      verified: true
    };

    setTimeout(() => {
      setReviews([submission, ...reviews]);
      setNewAuthor('');
      setNewBody('');
      setNewRating(5);
      setSubmittingState(false);
      setWriteOpen(false);
      setToastVisible(true);
      setActiveIdx(0);

      setTimeout(() => setToastVisible(false), 4000);
    }, 1200);
  };

  const currentReview = reviews[activeIdx] || reviews[0];

  return (
    <section id="reviews" className="py-16 md:py-24 bg-[#F8FAFC] text-slate-900 px-4 sm:px-6 md:px-10 relative overflow-hidden border-t border-slate-200">
      {/* Decorative vector backgrounds & glowing soft lights */}
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-slate-200/30 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#FF6B00] opacity-10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-slate-300 opacity-20 blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Big stats */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1.5 bg-orange-50 text-[#FF6B00] border border-orange-200 text-xs font-semibold px-3 py-1 rounded-full">
              <MessageSquare className="w-3.5 h-3.5" />
              GOOGLE MAPS VERIFIED FEEDBACK
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
              Flawless <span className="text-[#FF6B00]">5.0 Star</span> reputation
            </h2>
            <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
              Wholesale of Oklahoma sets the benchmark for wholesale speed, stacked vehicle help, store design setups, and direct deliveries across Central Oklahoma City.
            </p>

            {/* Google review banner metrics */}
            <div className="p-5 bg-white border border-slate-200 rounded-[24px] space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">5.0</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-slate-500 tracking-wider">Total reviews</span>
                  <p className="text-lg font-bold text-[#FF6B00]">{reviews.length + 9} Satisfied Audits</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-3 flex items-center justify-between text-xs text-slate-600">
                <span>"Smooth Ordering Process"</span>
                <span>"Friendly & Helpful"</span>
              </div>
            </div>

            <button
              onClick={() => setWriteOpen(true)}
              className="bg-[#FF6B00] hover:bg-[#E85F00] text-white font-bold text-xs uppercase px-6 py-3.5 rounded-full shadow-lg transition-all tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-white" />
              Leave a Google Review
            </button>
          </div>

          {/* Right Column - Sliding reviews & details */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
            <div className="relative min-h-[300px] flex flex-col justify-between p-6 sm:p-10 bg-white border border-slate-200 rounded-[32px] shadow-md">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 opacity-60">
                {[1, 2, 3, 4, 5].map((x) => (
                  <Star key={x} className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>

              <div className="space-y-6">
                <span className="text-[#FF6B00] font-mono text-xs uppercase tracking-widest block font-bold">
                  Testimonial {activeIdx + 1} of {reviews.length}
                </span>

                <blockquote className="text-lg sm:text-2xl font-light text-slate-800 leading-relaxed italic">
                  "{currentReview.body}"
                </blockquote>
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-slate-100 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center border border-orange-200 text-[#FF6B00]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">{currentReview.author}</h4>
                    <span className="text-xs text-slate-500 block">{currentReview.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{currentReview.date}</span>
                  {currentReview.verified && (
                    <span className="bg-orange-50 text-[#FF6B00] text-[9px] font-semibold px-2 py-0.5 rounded border border-orange-200">
                      Local Buyer Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Stepper Controllers */}
            <div className="flex items-center justify-end gap-3 self-end">
              <button
                onClick={() => setActiveIdx((prev) => (prev > 0 ? prev - 1 : reviews.length - 1))}
                className="w-10 h-10 rounded-full border border-slate-300 hover:border-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center text-slate-700 text-sm cursor-pointer shadow-xs"
                aria-label="Previous review"
              >
                ◀
              </button>
              <button
                onClick={() => setActiveIdx((prev) => (prev < reviews.length - 1 ? prev + 1 : 0))}
                className="w-10 h-10 rounded-full border border-slate-300 hover:border-slate-500 hover:bg-slate-100 transition-all flex items-center justify-center text-slate-700 text-sm cursor-pointer shadow-xs"
                aria-label="Next review"
              >
                ▶
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Review Submission Dialog overlay */}
      {writeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-[#0F172A]">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs" onClick={() => setWriteOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-50 text-slate-900 p-6 relative border-b border-slate-200">
              <span className="text-xs uppercase font-semibold text-[#FF6B00] tracking-wider block">Write a Map Review</span>
              <h4 className="text-xl sm:text-2xl font-bold mt-1 text-slate-900">Wholesale of Oklahoma Feedback</h4>
              <button
                onClick={() => setWriteOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer transition-colors"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g., Manish Malla"
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF6B00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">Review Rating</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="text-2xl transition-transform hover:scale-110 p-0.5 cursor-pointer text-amber-400"
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#FF6B00] ml-2">({newRating}.0 / 5.0 Stars)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block font-medium">Your Review Details</label>
                <textarea
                  rows={3}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="e.g., Fast communication, smooth ordering process, and dependable service every time."
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm text-slate-900 bg-slate-50 focus:bg-white focus:outline-none focus:border-[#FF6B00] resize-none"
                />
              </div>

              <div className="bg-slate-50 p-2 text-[10px] text-slate-500 rounded-xl flex gap-1 border border-slate-200">
                <FileText className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>Your review will appear in the client feedback loop instantly. We value your collaboration in Oklahoma territory.</span>
              </div>

              <button
                type="submit"
                disabled={submittingState}
                className="w-full py-3 bg-[#FF6B00] hover:bg-[#E85F00] text-white font-semibold text-xs rounded-full uppercase tracking-wider transition-colors disabled:opacity-50 cursor-pointer shadow-md"
              >
                {submittingState ? 'Submitting to system...' : 'Publish Google Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Instant Notification Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 bg-white border border-slate-200 text-slate-900 px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h5 className="font-semibold text-sm text-slate-900">Review Appended</h5>
            <p className="text-xs text-slate-500">Thank you for your review on Wholesale of Oklahoma!</p>
          </div>
        </div>
      )}
    </section>
  );
}
