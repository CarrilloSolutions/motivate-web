'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  sources: string[];         // absolute paths like /bg/xxx.mp4
  poster?: string;           // optional fallback image
  overlay?: boolean;         // dark overlay for readability
};

export default function RandomBackgroundVideo({
  sources,
  poster = '/bg/fallback.jpg',
  overlay = true,
}: Props) {
  const [chosen, setChosen] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pick ONE on mount; change only after hard refresh
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

  // Pause when tab hidden (tiny perf win)
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

  // Fallback image only
  if (!chosen) {
    return (
      <>
        <div
          className="fixed inset-0 -z-10 bg-black"
          aria-hidden
          style={{
            backgroundImage: `url(${poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        {overlay && (
          <div
            className="fixed inset-0 -z-10 pointer-events-none"
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
        className="fixed inset-0 -z-10 w-full h-full object-cover pointer-events-none"
        src={chosen}
        poster={poster}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        aria-hidden
      />
      {overlay && (
        <div
          className="fixed inset-0 -z-10 pointer-events-none"
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