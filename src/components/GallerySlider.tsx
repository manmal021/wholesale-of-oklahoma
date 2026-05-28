import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, X, Images, ZoomIn } from 'lucide-react';

const images = [
  '/gallery/img_(1).jpg',
  '/gallery/img_(2).jpg',
  '/gallery/img_(3).jpg',
  '/gallery/img_(4).jpg',
  '/gallery/img_(5).jpg',
  '/gallery/img_(6).jpg',
  '/gallery/img_(7).jpg',
  '/gallery/img_(8).jpg',
  '/gallery/img_(9).jpg',
  '/gallery/img_(10).jpg',
  '/gallery/img_(11).jpg',
  '/gallery/img_(12).jpg',
  '/gallery/img_(13).jpg',
  '/gallery/img_(14).jpg',
  '/gallery/img_(15).jpg',
  '/gallery/img_(16).jpg',
  '/gallery/img_(17).jpg',
  '/gallery/img_(18).jpg',
  '/gallery/img_(19).jpg',
  '/gallery/img_(20).jpg',
  '/gallery/img_(21).jpg',
  '/gallery/img_(22).jpg',
  '/gallery/img_(23).jpg',
  '/gallery/img_(24).jpg',
  '/gallery/Screenshot_1.png',
  '/gallery/Screenshot_2.png',
  '/gallery/Screenshot_3.png',
  '/gallery/Screenshot_4.png',
  '/gallery/Screenshot_5.png',
  '/gallery/Screenshot_6.png',
  '/gallery/Screenshot_7.png',
];

export default function GallerySlider() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const next = useCallback(() => {
    setActiveIdx((prev) => (prev + 1) % images.length);
  }, []);

  const prev = useCallback(() => {
    setActiveIdx((prev) => (prev - 1 + images.length) % images.length);
  }, []);

  // Auto-slide every 3.5 seconds
  useEffect(() => {
    if (isPaused || lightboxIdx !== null) return;
    timerRef.current = setInterval(next, 3500);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, isPaused, lightboxIdx]);

  // Keyboard navigation in lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setLightboxIdx((prev) => prev !== null ? (prev + 1) % images.length : null);
      if (e.key === 'ArrowLeft') setLightboxIdx((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null);
      if (e.key === 'Escape') setLightboxIdx(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [lightboxIdx]);

  // Visible slides: show 3 at a time (center + left + right neighbors)
  const getVisibleSlides = () => {
    const total = images.length;
    return [
      (activeIdx - 1 + total) % total,
      activeIdx,
      (activeIdx + 1) % total,
    ];
  };

  const visibleSlides = getVisibleSlides();

  return (
    <section id="gallery" className="py-16 md:py-24 bg-[#f5f5f4] px-4 sm:px-6 md:px-10 overflow-hidden">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-[#1f2a1d]/5 text-[#3d5638] text-xs font-semibold px-3 py-1 rounded-full mb-3">
              <Images className="w-3.5 h-3.5" />
              STORE GALLERY
            </div>
            <h2 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#1f2a1d] leading-tight">
              Inside Our <span className="text-[#85AB8B]">Warehouse</span>
            </h2>
            <p className="text-[#4b5b47] text-sm mt-2 max-w-md">
              A look inside Wholesale of Oklahoma — our products, shelves, and what makes us the go-to supplier for smoke shops across OKC.
            </p>
          </div>
          <span className="text-xs text-neutral-400 font-semibold self-start sm:self-end">
            {activeIdx + 1} / {images.length}
          </span>
        </div>

        {/* Main Slider */}
        <div
          className="relative"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Slides Row */}
          <div className="flex items-center justify-center gap-4 h-[320px] sm:h-[420px] md:h-[500px]">
            {visibleSlides.map((imgIdx, position) => {
              const isCenter = position === 1;
              return (
                <div
                  key={imgIdx}
                  onClick={() => isCenter ? setLightboxIdx(imgIdx) : setActiveIdx(imgIdx)}
                  className={`relative overflow-hidden rounded-2xl transition-all duration-500 cursor-pointer flex-shrink-0 ${
                    isCenter
                      ? 'w-[55%] sm:w-[60%] h-full shadow-2xl border-2 border-[#85AB8B]/30 z-10'
                      : 'w-[20%] sm:w-[18%] h-[75%] opacity-50 hover:opacity-70 shadow-md border border-[#1f2a1d]/10'
                  }`}
                >
                  <img
                    src={images[imgIdx]}
                    alt={`Gallery photo ${imgIdx + 1}`}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                  {isCenter && (
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1f2a1d]/40 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                      <span className="inline-flex items-center gap-1.5 bg-white/90 text-[#1f2a1d] text-xs font-bold px-4 py-2 rounded-full shadow">
                        <ZoomIn className="w-3.5 h-3.5" />
                        View Full Size
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Arrow Buttons */}
          <button
            onClick={prev}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 sm:-translate-x-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1f2a1d] hover:bg-[#2d3a2a] text-white shadow-lg flex items-center justify-center transition-all z-20"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={next}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 sm:translate-x-4 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-[#1f2a1d] hover:bg-[#2d3a2a] text-white shadow-lg flex items-center justify-center transition-all z-20"
            aria-label="Next image"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot Indicators */}
        <div className="flex items-center justify-center gap-1.5 mt-8 flex-wrap max-w-xs mx-auto">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? 'w-6 h-2 bg-[#1f2a1d]'
                  : 'w-2 h-2 bg-[#1f2a1d]/20 hover:bg-[#1f2a1d]/40'
              }`}
              aria-label={`Go to image ${i + 1}`}
            />
          ))}
        </div>

        {/* Thumbnail Strip */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`flex-shrink-0 w-16 h-12 sm:w-20 sm:h-14 rounded-lg overflow-hidden border-2 transition-all duration-300 ${
                i === activeIdx
                  ? 'border-[#85AB8B] opacity-100 scale-105'
                  : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={src} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
          onClick={() => setLightboxIdx(null)}
        >
          <div
            className="relative max-w-5xl w-full max-h-[90vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={images[lightboxIdx]}
              alt={`Gallery full ${lightboxIdx + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />

            {/* Close */}
            <button
              onClick={() => setLightboxIdx(null)}
              className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Close lightbox"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Prev / Next */}
            <button
              onClick={() => setLightboxIdx((prev) => prev !== null ? (prev - 1 + images.length) % images.length : null)}
              className="absolute left-2 sm:left-[-48px] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => setLightboxIdx((prev) => prev !== null ? (prev + 1) % images.length : null)}
              className="absolute right-2 sm:right-[-48px] w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Counter */}
            <span className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/70 text-xs font-semibold bg-black/40 px-3 py-1 rounded-full">
              {lightboxIdx + 1} / {images.length}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
