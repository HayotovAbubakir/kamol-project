'use client';

import type { CustomBackgroundMediaType } from '@/lib/customBackgrounds';

interface CustomMediaBackgroundProps {
  mediaType: CustomBackgroundMediaType;
  src: string;
}

export function CustomMediaBackground({ mediaType, src }: CustomMediaBackgroundProps) {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 h-[100dvh] w-screen overflow-hidden"
      aria-hidden
    >
      {mediaType === 'video' ? (
        <video
          src={src}
          autoPlay
          loop
          muted
          playsInline
          className="custom-bg-cover"
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="custom-bg-cover" draggable={false} />
      )}
      <div className="atmosphere-custom-overlay absolute inset-0" />
    </div>
  );
}
