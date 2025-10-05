// components/RandomBackgroundVideo.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  sources: string[];
  poster?: string;
  overlay?: boolean;
};

export default function RandomBackgroundVideo({
  sources,
  poster = '/bg/fallback.jpg',
  overlay = true,
}: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced || !sources?.length) {
      setChosen(null);
      return;
    }
    const idx = Math.floor(Math.random() * sources.length);
    setChosen(sources[idx]);
  }, [sources]);

  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // Fallback image when reduced-motion or no sources
  if (!chosen) {
    return (
      <>
        <div
          className="fixed inset-0 z-0 bg-black"
          aria-hidden
          style={{
            backgroundImage: `url(${poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {overlay && (
          <div
            className="fixed inset-0 z-0 pointer-events-none"
            aria-hidden
            style={{
              background:
                'linear-gradient(to bottom, rgba(0,0,0,.35), rgba(0,0,0,.6))',
            }}
          />
        )}
      </>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none"
        src={chosen}
        poster={poster}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        draggable={false}
        aria-hidden
      />
      {overlay && (
        <div
          className="fixed inset-0 z-0 pointer-events-none"
          aria-hidden
          style={{
            background:
              'linear-gradient(to bottom, rgba(0,0,0,.35), rgba(0,0,0,.6))',
          }}
        />
      )}
    </>
  );
}
