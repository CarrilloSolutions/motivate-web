"use client";

import { useEffect, useRef, useState, useMemo } from "react";

type Props = {
  /** Optional custom pool; if omitted we use defaults in /public/bg */
  sources?: string[];
  /** Fallback poster */
  poster?: string;
  /** Dark overlay */
  overlay?: boolean;
};

export default function RandomBackgroundVideo({
  sources,
  poster = "/bg/fallback.jpg",
  overlay = true,
}: Props) {
  // ✅ Always have a pool (fixes “only fallback image” issue)
  const pool = useMemo(
    () =>
      (sources && sources.length > 0)
        ? sources
        : ["/bg/loop1.mp4", "/bg/loop2.mp4", "/bg/loop3.mp4"],
    [sources]
  );

  const [src, setSrc] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const idx = Math.floor(Math.random() * pool.length);
    setSrc(pool[idx] ?? null);
  }, [pool]);

  // Pause when tab hidden
  useEffect(() => {
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  if (!src) {
    // Quick image fallback while first pick happens
    return (
      <>
        <img
          src={poster}
          alt=""
          className="fixed inset-0 z-0 w-full h-full object-cover"
          aria-hidden
        />
        {overlay && <div className="fixed inset-0 z-0 bg-black/45 pointer-events-none" aria-hidden />}
      </>
    );
  }

  return (
    <>
      <video
        ref={videoRef}
        src={src}
        muted
        loop
        autoPlay
        playsInline
        preload="metadata"
        className="fixed inset-0 z-0 w-full h-full object-cover pointer-events-none"
        disablePictureInPicture
        controlsList="nodownload noplaybackrate noremoteplayback"
        onContextMenu={(e) => e.preventDefault()}
        aria-hidden
      />
      {overlay && <div className="fixed inset-0 z-0 bg-black/45 pointer-events-none" aria-hidden />}
    </>
  );
}
