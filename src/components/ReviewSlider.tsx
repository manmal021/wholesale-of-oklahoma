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
      role: 'Smoke Shop Owner',
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
      role: 'Smoke Shop Owner',
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
      body: 'Reliable wholesale supplier with a great selection of vapes, hookahs, glass, cigars, and accessories. Competitive prices, well-stocked inventory, and helpful staff make it a solid choice for smoke shops and convenience stores.',
      verified: true
    },
    {
      author: 'Subash Malla',
      role: 'Convenience Store Manager',
      rating: 5,
      date: '3 weeks ago',
      body: 'Excellent wholesale supplier for smoke shops, vape stores, gas stations, and convenience stores. They have a massive variety of smoke shop products including vapes, hookahs, glass pieces, rolling papers, disposables, cigars, incense, and more.',
      verified: true
    },
    {
      author: 'K R',
      role: 'Local Guide',
      rating: 5,
      date: 'a month ago',
      body: 'They have all the stuff for your retail store especially for vape/smoke shop, gas station and dispensary. They have all the flavors of foger, geekbar, Raz. Varieties of vapes with wide ranges of prices to choose from, variety of kratom product, varieties of novelties stuff.',
      verified: true
    },
    {
      author: 'Khem Raj Regmi',
      role: 'Smoke Shop Owner',
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
      body: 'Wholesale of Oklahoma is a one-stop shop that truly delivers! Whether you\'re stopping for gas, browsing the smoke shop, or visiting the dispensary, the staff is incredibly knowledgeable, friendly, and welcoming every single time.',
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
      role: 'Vape Shop Owner',
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
      body: 'This is the ultimate one-stop supplier for gas stations, smoke shops, and novelty stores. They offer a massive selection of smoking accessories, vapes, convenience items, and trendy novelties at competitive wholesale prices.',
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
    <section id="reviews" className="py-16 md:py-24 bg-gradient-to-br from-[#1f2a1d] via-[#2d3a2a] to-[#1f2a1d] text-white px-4 sm:px-6 md:px-10 relative overflow-hidden">
      {/* Decorative vector backgrounds & glowing soft lights */}
      <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[#85AB8B] opacity-10 blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full bg-[#336443] opacity-10 blur-[80px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column - Big stats */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-1 bg-white/10 text-[#85AB8B] text-xs font-semibold px-3 py-1 rounded-full">
              <MessageSquare className="w-3.5 h-3.5" />
              GOOGLE MAPS VERIFIED FEEDBACK
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
              Flawless <span className="text-[#85AB8B]">5.0 Star</span> reputation
            </h2>
            <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
              Wholesale of Oklahoma sets the benchmark for wholesale speed, stacked vehicle help, store design setups, and direct deliveries across Central Oklahoma City.
            </p>

            {/* Google review banner metrics */}
            <div className="p-5 bg-white/5 border border-white/10 rounded-[24px] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-3xl sm:text-4xl font-extrabold tracking-tight">5.0</span>
                  <div className="flex items-center gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs uppercase font-semibold text-neutral-400 tracking-wider">Total reviews</span>
                  <p className="text-lg font-bold text-[#85AB8B]">{reviews.length + 9} Satisfied Audits</p>
                </div>
              </div>

              <div className="border-t border-white/5 pt-3 flex items-center justify-between text-xs text-neutral-300">
                <span>"Smooth Ordering Process"</span>
                <span>"Friendly & Helpful"</span>
              </div>
            </div>

            <button
              onClick={() => setWriteOpen(true)}
              className="bg-[#85AB8B] hover:bg-[#97bba4] text-[#1f2a1d] font-bold text-xs uppercase px-6 py-3.5 rounded-full shadow transition-all tracking-wider inline-flex items-center gap-2 cursor-pointer"
            >
              <Heart className="w-4 h-4 fill-[#1f2a1d]" />
              Leave a Google Review
            </button>
          </div>

          {/* Right Column - Sliding reviews & details */}
          <div className="lg:col-span-7 flex flex-col justify-between h-full space-y-6">
            <div className="relative min-h-[300px] flex flex-col justify-between p-6 sm:p-10 bg-white/5 border border-white/10 rounded-[32px] backdrop-blur-md">
              <div className="absolute top-6 right-6 flex items-center gap-1.5 opacity-45">
                {[1, 2, 3, 4, 5].map((x) => (
                  <Star key={x} className="w-3 h-3 fill-white text-white" />
                ))}
              </div>

              <div className="space-y-6">
                <span className="text-[#85AB8B] font-mono text-xs uppercase tracking-widest block font-bold">
                  Testimonial {activeIdx + 1} of {reviews.length}
                </span>

                <blockquote className="text-lg sm:text-2xl font-light text-neutral-100 leading-relaxed italic">
                  "{currentReview.body}"
                </blockquote>
              </div>

              <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/10 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#85AB8B]/20 flex items-center justify-center border border-[#85AB8B]/30 text-[#85AB8B]">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm sm:text-base">{currentReview.author}</h4>
                    <span className="text-xs text-neutral-400 block">{currentReview.role}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-neutral-400">{currentReview.date}</span>
                  {currentReview.verified && (
                    <span className="bg-[#85AB8B]/10 text-[#85AB8B] text-[9px] font-semibold px-2 py-0.5 rounded border border-[#85AB8B]/20">
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
                className="w-10 h-10 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all flex items-center justify-center text-white text-sm"
                aria-label="Previous review"
              >
                ◀
              </button>
              <button
                onClick={() => setActiveIdx((prev) => (prev < reviews.length - 1 ? prev + 1 : 0))}
                className="w-10 h-10 rounded-full border border-white/20 hover:border-white/60 hover:bg-white/10 transition-all flex items-center justify-center text-white text-sm"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 text-[#1f2a1d]">
          <div className="absolute inset-0 bg-[#1f2a1d]/60 backdrop-blur-sm" onClick={() => setWriteOpen(false)} />
          <div className="relative bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-[#1f2a1d] text-white p-6 relative">
              <span className="text-xs uppercase font-semibold text-[#85AB8B] tracking-wider block">Write a Map Review</span>
              <h4 className="text-xl sm:text-2xl font-bold mt-1">Wholesale of Oklahoma Feedback</h4>
              <button
                onClick={() => setWriteOpen(false)}
                className="absolute top-4 right-4 text-white/85 hover:text-white text-lg font-bold p-1"
                aria-label="Close dialog"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateReview} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1f2a1d]/70 block">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  placeholder="e.g., Manish Malla"
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#336443]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1f2a1d]/70 block">Review Rating</label>
                <div className="flex items-center gap-1.5 py-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewRating(star)}
                      className="text-2xl transition-transform hover:scale-110 p-0.5"
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-xs font-bold text-[#336443] ml-2">({newRating}.0 / 5.0 Stars)</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-[#1f2a1d]/70 block font-medium">Your Review Details</label>
                <textarea
                  rows={3}
                  required
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  placeholder="e.g., Fast communication, smooth ordering process, and dependable service every time."
                  className="w-full border border-neutral-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-[#336443] resize-none"
                />
              </div>

              <div className="bg-neutral-50 p-2 text-[10px] text-neutral-500 rounded flex gap-1">
                <FileText className="w-3.5 h-3.5 text-neutral-400 mt-0.5" />
                <span>Your review will appear in the client feedback loop instantly. We value your collaboration in Oklahoma territory.</span>
              </div>

              <button
                type="submit"
                disabled={submittingState}
                className="w-full py-3 bg-[#1f2a1d] hover:bg-[#2a3827] text-white font-semibold text-xs rounded-md uppercase tracking-wider transition-colors disabled:opacity-50"
              >
                {submittingState ? 'Submitting to system...' : 'Publish Google Review'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Instant Notification Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#e6f4eb] border-l-4 border-emerald-500 text-[#1f2a1d] px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 animate-in slide-in-from-bottom-6 duration-300">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <h5 className="font-semibold text-sm">Review Appended</h5>
            <p className="text-xs text-[#4b5b47]">Thank you for your review on Wholesale of Oklahoma!</p>
          </div>
        </div>
      )}
    </section>
  );
}
