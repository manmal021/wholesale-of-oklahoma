import React from 'react';

interface MarqueeItem {
  src: string;
  alt: string;
  label: string;
}

// Row 1 — scrolls left
const ROW_1: MarqueeItem[] = [
  { src: '/products/vozol-50k.png',               alt: 'VOZOL 50K disposable vape wholesale',         label: 'VOZOL' },
  { src: '/products/geekbar-60k.png',             alt: 'Geek Bar 60K disposable vape wholesale',      label: 'Geek Bar 60K' },
  { src: '/products/geekbar-25k.png',             alt: 'Geek Bar 25K disposable vape',                label: 'Geek Bar 25K' },
  { src: '/products/geekbar-15k.png',             alt: 'Geek Bar 15K disposable vape',                label: 'Geek Bar 15K' },
  { src: '/products/foger-30k.jpg',               alt: 'Foger 30K swappable pod system wholesale',   label: 'Foger 30K' },
  { src: '/products/raz-25k.png',                 alt: 'RAZ 25K HD display disposable vape',         label: 'RAZ 25K' },
  { src: '/products/raz-pod.png',                 alt: 'RAZ refillable pod system',                   label: 'RAZ Pod' },
  { src: '/products/lostmary-mt15000.png',        alt: 'Lost Mary MT15000 disposable vape wholesale', label: 'Lost Mary' },
  { src: '/products/oxbar-magic-maze.png',        alt: 'OXBAR Magic Maze variable wattage vape',     label: 'OXBAR' },
  { src: '/products/raw-classic-king-size-box.png', alt: 'RAW Classic King Size rolling papers',    label: 'RAW Papers' },
];

// Row 2 — scrolls right
const ROW_2: MarqueeItem[] = [
  { src: '/products/thca-diamond-prerolls.png',   alt: 'THCA Diamond Prerolls wholesale',            label: 'THCA Diamond' },
  { src: '/products/delta-live-resin-disposable-2g.png', alt: 'Delta Live Resin 2G disposable',    label: 'Delta Live Resin' },
  { src: '/products/vaporesso-xros-4.png',        alt: 'Vaporesso XROS 4 refillable pod system',    label: 'Vaporesso XROS 4' },
  { src: '/products/smok-novo-5.png',             alt: 'SMOK Novo 5 pod system wholesale',           label: 'SMOK Novo 5' },
  { src: '/products/geekbar-kit.png',             alt: 'Geek Bar kit hardware wholesale',            label: 'Geek Bar Kit' },
  { src: '/products/geekbar-pod.png',             alt: 'Geek Bar refillable pod',                    label: 'Geek Bar Pod' },
  { src: '/products/king-palm-cones-display.png', alt: 'King Palm natural leaf cones display',       label: 'King Palm' },
  { src: '/products/cbd-relax-gummies-1000mg.png',alt: 'CBD Relax Gummies 1000mg wholesale',         label: 'CBD Gummies' },
  { src: '/products/eyce-silicone-beaker.png',    alt: 'Eyce silicone beaker water pipe',            label: 'Eyce Silicone' },
  { src: '/products/coastal-clouds-60ml.png',     alt: 'Coastal Clouds 60ml e-liquid wholesale',     label: 'Coastal Clouds' },
];

function MarqueeCard({ item }: { item: MarqueeItem }) {
  return (
    <div className="brand-marquee-card">
      <div className="brand-marquee-img-wrap">
        <img
          src={item.src}
          alt={item.alt}
          width="96"
          height="96"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      </div>
      <span className="brand-marquee-label">{item.label}</span>
    </div>
  );
}

function MarqueeRow({
  items,
  direction = 'left',
  speed = 40,
}: {
  items: MarqueeItem[];
  direction?: 'left' | 'right';
  speed?: number;
}) {
  // Duplicate items for seamless looping
  const doubled = [...items, ...items];
  const animClass = direction === 'left' ? 'brand-marquee-track-left' : 'brand-marquee-track-right';
  const style = { '--marquee-speed': `${speed}s` } as React.CSSProperties;

  return (
    <div className="brand-marquee-row" aria-hidden="true">
      <div className={`brand-marquee-track ${animClass}`} style={style}>
        {doubled.map((item, i) => (
          <MarqueeCard key={`${item.label}-${i}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function BrandMarquee() {
  return (
    <section
      id="brand-marquee"
      aria-label="Featured brands we carry"
      className="brand-marquee-section"
    >
      {/* Dual marquee rows */}
      <div className="brand-marquee-rows">
        {/* Fade masks on left & right edges */}
        <div className="brand-marquee-fade-left"  aria-hidden="true" />
        <div className="brand-marquee-fade-right" aria-hidden="true" />

        <MarqueeRow items={ROW_1} direction="left"  speed={38} />
        <MarqueeRow items={ROW_2} direction="right" speed={44} />
      </div>
    </section>
  );
}

