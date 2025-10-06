"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  sources?: string[];         // pass your pool (BG_SOURCES)
  poster?: string;
  overlay?: boolean;
};

export default function RandomBackgroundVideo({
  sources,
  poster = "/bg/fallback.jpg",
  overlay = true,
}: Props) {
  // Always have a pool (use whatever was passed; otherwise show poster)
  const pool = useMemo(() => sources ?? [], [sources]);

  const [src, setSrc] = useState<string | null>(null);
  const vref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (!pool.length) {
      setSrc(null);
      return;
    }
    const i = Math.floor(Math.random() * pool.length);
    setSrc(pool[i] ?? null);
  }, [pool]);

  // keep playing when tab regains focus
  useEffect(() => {
    const onVis = () => {
      const v = vref.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!src) {
    // Poster fallback only until a source is picked
    return (
      <>
        <img src={poster} alt="" className="fixed inset-0 z-0 w-full h-full object-cover" aria-hidden />
        {overlay && <div className="fixed inset-0 z-0 bg-black/45 pointer-events-none" aria-hidden />}
      </>
    );
  }

  return (
    <>
      <video
        ref={vref}
        src={src}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none"
        onError={() => setSrc(null)} // fall back to poster if a file fails
      />
      {overlay && <div className="fixed inset-0 z-0 bg-black/45 pointer-events-none" aria-hidden />}
    </>
  );
}
