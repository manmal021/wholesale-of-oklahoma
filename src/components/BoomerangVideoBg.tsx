import React, { useRef, useEffect } from 'react';

type Props = {
  src: string;
  className?: string;
  isMirrored?: boolean;
  isColorInverted?: boolean;
  isClear?: boolean;
  overlayOpacity?: number; // 0 to 100
};

export default function BoomerangVideoBg({
  src,
  className,
  isMirrored = true,
  isColorInverted = true,
  isClear = true,
  overlayOpacity = 15
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const playVideo = async () => {
      if (videoRef.current) {
        try {
          videoRef.current.load();
          videoRef.current.muted = true;
          await videoRef.current.play();
        } catch (err) {
          console.log("Autoplay requested/prevented successfully in sandbox:", err);
        }
      }
    };
    playVideo();
  }, [src]);

  return (
    <div className={className ?? 'absolute inset-0 w-full h-full'}>
      <video
        ref={videoRef}
        className="absolute inset-0 z-0 w-full h-full object-cover select-none pointer-events-none transition-all duration-500"
        style={{
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
          filter: `brightness(${isClear ? '1.25' : '0.90'}) contrast(${isClear ? '1.15' : '1.0'}) ${isColorInverted ? 'invert(1)' : 'invert(0)'}`,
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
        className="absolute inset-0 pointer-events-none bg-black transition-all duration-300"
        style={{ opacity: overlayOpacity / 100 }}
      />
      <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t transition-all duration-300 ${isClear
        ? 'from-[#1f2a1d]/40 via-transparent to-[#1f2a1d]/10'
        : 'from-[#1f2a1d]/85 via-transparent to-[#1f2a1d]/40'
        }`} />
    </div>
  );
}
