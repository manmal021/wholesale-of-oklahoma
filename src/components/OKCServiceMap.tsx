import React, { useState, useEffect, useRef } from 'react';
import { MapPin } from 'lucide-react';

// OKC metro + nearby Oklahoma service areas
const SERVICE_AREAS = [
  { name: 'Oklahoma City', x: 47, y: 52 },
  { name: 'Edmond',        x: 48, y: 37 },
  { name: 'Moore',         x: 47, y: 60 },
  { name: 'Norman',        x: 46, y: 67 },
  { name: 'Midwest City',  x: 56, y: 53 },
  { name: 'Yukon',         x: 36, y: 52 },
  { name: 'Mustang',       x: 36, y: 60 },
  { name: 'Del City',      x: 55, y: 57 },
  { name: 'Bethany',       x: 40, y: 50 },
  { name: 'Warr Acres',    x: 40, y: 48 },
  { name: 'Nichols Hills', x: 46, y: 47 },
  { name: 'The Village',   x: 45, y: 44 },
  { name: 'Choctaw',       x: 62, y: 53 },
  { name: 'Shawnee',       x: 72, y: 54 },
  { name: 'Stillwater',    x: 53, y: 22 },
  { name: 'Tulsa',         x: 88, y: 20 },
];

function pickRandom<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface ActivePin {
  area: typeof SERVICE_AREAS[0];
  key: number;
  fading: boolean;
}

export default function OKCServiceMap() {
  const [pins, setPins] = useState<ActivePin[]>([]);
  const counterRef = useRef(0);
  const prefersReduced = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  // Initial pins
  useEffect(() => {
    const areas = pickRandom(SERVICE_AREAS, 1);
    setPins(areas.map((area) => ({ area, key: counterRef.current++, fading: false })));
  }, []);

  // Rotate every 1 minute
  useEffect(() => {
    if (prefersReduced) return;
    const interval = setInterval(() => {
      // Mark existing as fading
      setPins((prev) => prev.map((p) => ({ ...p, fading: true })));

      // After fade-out, pick new
      const timeout = setTimeout(() => {
        const areas = pickRandom(SERVICE_AREAS, 1);
        setPins(areas.map((area) => ({ area, key: counterRef.current++, fading: false })));
      }, 600);

      return () => clearTimeout(timeout);
    }, 60000);
    return () => clearInterval(interval);
  }, [prefersReduced]);

  return (
    <section id="service-areas" className="okc-map-section">
      <div className="okc-map-inner">
        {/* Text side */}
        <div className="okc-map-text">
          <div className="section-label" style={{ marginBottom: '0.875rem' }}>
            <MapPin className="w-3 h-3" />
            Service Coverage
          </div>
          <h2 className="okc-map-title">Customers in OKC We Serve</h2>
          <p className="okc-map-desc">
            We work with smoke shops, convenience stores, and retail buyers across OKC and
            nearby Oklahoma areas. Pick up from our warehouse on S Bryant Ave or contact us
            to check availability.
          </p>

          <ul className="okc-map-list">
            {[
              'Smoke shops and vape shops',
              'Convenience stores and C-stores',
              'Dispensaries and hemp retailers',
              'General retail and novelty stores',
            ].map((item) => (
              <li key={item} className="okc-map-list-item">
                <span className="okc-map-dot" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <div className="okc-map-address">
            <strong>Warehouse:</strong> 4500 S Bryant Ave, OKC, OK 73135
            <br />
            <a href="tel:4057682975" className="okc-map-phone">(405) 768-2975</a>
            &nbsp;· Mon–Sat 9AM–8PM · Sun 11AM–8PM
          </div>
        </div>

        {/* SVG Map side */}
        <div className="okc-map-visual relative w-full h-[400px] rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm" aria-label="Oklahoma service area map — general coverage illustration">
          <img 
            src="/oklahoma-map.jpg" 
            alt="Map of Oklahoma" 
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay SVG for pins */}
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full z-10"
            aria-hidden="true"
            role="img"
          >
            {/* OKC star marker — always visible */}
            <circle cx="47" cy="52" r="1.5" fill="var(--accent-primary)" opacity="0.9" />
            <text x="50" y="53.5" fontSize="3.5" fill="var(--accent-primary)" fontWeight="700" fontFamily="sans-serif" stroke="white" strokeWidth="0.5" paintOrder="stroke">OKC</text>

            {/* Animated service pins */}
            {pins.map(({ area, key, fading }) => (
              <g
                key={key}
                style={{
                  opacity: fading ? 0 : 1,
                  transition: 'opacity 0.5s ease',
                }}
              >
                {/* Pulse ring */}
                <circle
                  cx={area.x}
                  cy={area.y}
                  r="4"
                  fill="var(--accent-primary)"
                  opacity="0"
                  className="okc-pin-pulse"
                />
                {/* Solid dot */}
                <circle
                  cx={area.x}
                  cy={area.y}
                  r="1.8"
                  fill="var(--accent-primary)"
                  opacity="0.85"
                />
                {/* Label */}
                <text
                  x={area.x + 2.5}
                  y={area.y + 0.8}
                  fontSize="2.8"
                  fill="#1e293b"
                  fontFamily="sans-serif"
                  fontWeight="800"
                  stroke="white"
                  strokeWidth="0.8"
                  paintOrder="stroke"
                >
                  {area.name}
                </text>
              </g>
            ))}
          </svg>

          {/* Live badge */}
          <div className="okc-map-live-badge">
            <span className="okc-map-live-dot" aria-hidden="true" />
            Active service areas
          </div>
        </div>
      </div>
    </section>
  );
}
