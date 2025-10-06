"use client";

import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VideoCard from "@/components/VideoCard";
import RandomBackgroundVideo from "@/components/RandomBackgroundVideo";
import Navbar from "@/components/Navbar";

type VideoDoc = {
  id: string;
  url: string;
  title?: string;
  tags?: string[];
  hashtags?: string[];
  createdAt?: any;
  poster?: string;
};

export default function MainMenuPage() {
  const [videos, setVideos] = useState<VideoDoc[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [autoScroll, setAutoScroll] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    const v = localStorage.getItem("autoScroll");
    return v ? v === "1" : true;
  });

  const containerRef = useRef<HTMLDivElement | null>(null);
  const sectionsRef = useRef<(HTMLDivElement | null)[]>([]);

  // feed
  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VideoDoc[];
      setVideos(list);
    });
    return () => unsub();
  }, []);

  // intersection to track current card
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.index);
            if (!Number.isNaN(idx)) setActiveIndex(idx);
          }
        }
      },
      { root: container, threshold: 0.6 }
    );

    sectionsRef.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, [videos.length]);

  // advance to next
  const goNext = () => {
    const next = Math.min(activeIndex + 1, videos.length - 1);
    const el = sectionsRef.current[next];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const toggleAuto = () => {
    setAutoScroll((s) => {
      const n = !s;
      if (typeof window !== "undefined") localStorage.setItem("autoScroll", n ? "1" : "0");
      return n;
    });
  };

  return (
    <div className="relative">
      <RandomBackgroundVideo />

      {/* Auto-scroll toggle */}
      <div className="fixed right-4 top-4 z-20">
        <button
          onClick={toggleAuto}
          className={`rounded-full px-3 py-1.5 text-sm border ${
            autoScroll ? "border-emerald-500 text-emerald-400" : "border-zinc-600 text-zinc-300"
          } bg-black/40 backdrop-blur`}
          title="Auto-scroll to next video when finished"
        >
          Auto-scroll: {autoScroll ? "On" : "Off"}
        </button>
      </div>

      {/* Snap container */}
      <div
        ref={containerRef}
        className="relative z-10 h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      >
        <div className="px-4 pt-6">
          <h1 className="text-xl font-semibold text-zinc-100">Today's Motivation</h1>
        </div>

        {videos.map((v, i) => (
          <section
            key={v.id}
            data-index={i}
            ref={(el: HTMLDivElement | null) => {
              // ✅ ensure callback returns void (not the assigned value)
              sectionsRef.current[i] = el;
            }}
            className="snap-start"
          >
            <VideoCard
              video={{ ...v, tags: (v.tags && v.tags.length ? v.tags : v.hashtags) ?? [] }}
              active={i === activeIndex}
              defaultMuted={false}  // try sound first
              onEnded={() => {
                if (autoScroll) goNext();
              }}
            />
          </section>
        ))}

        <div className="h-24" />
      </div>

      <Navbar />
    </div>
  );
}
