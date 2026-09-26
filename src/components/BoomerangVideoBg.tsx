import React, { useRef, useEffect } from 'react';

type Props = {
  src: string;
  className?: string;
  isMirrored?: boolean;
  isColorInverted?: boolean;
  isClear?: boolean;
  overlayOpacity?: number; // 0 to 100
  overlayTheme?: 'dark' | 'light';
};

export default function BoomerangVideoBg({
  src,
  className,
  isMirrored = true,
  isColorInverted = true,
  isClear = true,
  overlayOpacity = 15,
  overlayTheme = 'light'
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);


  return (
    <div className={className ?? 'absolute inset-0 w-full h-full'}>
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 w-full h-full object-cover select-none pointer-events-none transition-all duration-500 opacity-90"
        style={{
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
          filter: `brightness(${isClear ? '1.25' : '1.0'}) contrast(${isClear ? '1.15' : '1.0'})`,
        }}
        autoPlay={true}
        loop={true}
        muted={true}
        playsInline={true}
        preload="auto"
      >
        <source src={src} type="video/mp4" />
      </video>
      <div
        className={`absolute inset-0 pointer-events-none transition-all duration-300 ${
          overlayTheme === 'light' ? 'bg-[#F8FAFC]' : 'bg-black'
        }`}
        style={{ opacity: overlayOpacity / 100 }}
      />
      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t transition-all duration-300 ${
        overlayTheme === 'light'
          ? 'from-[#F8FAFC]/30 via-transparent to-white/10'
          : isClear
          ? 'from-[#0f172A]/40 via-transparent to-[#0f172A]/10'
          : 'from-[#0f172A]/70 via-transparent to-[#0f172A]/30'
      }`} />
    </div>
  );
}
