// components/RandomBackgroundVideo.tsx
'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  sources?: string[];
  poster?: string;
  overlay?: boolean;
};

const DEFAULT_SOURCES = [
  // use any you have in /public/bg (from your screenshot)
  '/bg/3595-172488292.mp4',
  '/bg/19873-908438835.mp4',
  '/bg/217763_tiny.mp4',
  '/bg/2337-157269912.mp4',
  '/bg/243156_medium.mp4',
  '/bg/230724.mp4',
];

export default function RandomBackgroundVideo({
  sources = DEFAULT_SOURCES,
  poster = '/bg/fallback.jpg',
  overlay = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [src, setSrc] = useState<string | null>(null);

  // pick one on mount
  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced || sources.length === 0) {
      setSrc(null);
      return;
    }
    const i = Math.floor(Math.random() * sources.length);
    setSrc(sources[i]);
  }, [sources]);

  // keep playing when tab refocuses
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

  return (
    <>
      {src ? (
        <video
          ref={videoRef}
          className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none"
          src={src}
          poster={poster}
          muted
          loop
          autoPlay
          playsInline
          preload="metadata"
          disablePictureInPicture
          controls={false}
          aria-hidden
        />
      ) : (
        <div
          className="fixed inset-0 z-0 bg-black"
          aria-hidden
          style={{
            backgroundImage: `url(${poster})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      )}
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
