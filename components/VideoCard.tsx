"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";

type VideoDoc = {
  id: string;
  url: string;
  title?: string;
  tags?: string[]; // NEW
  createdAt?: any;
  poster?: string;
};

function joinTags(tags?: string[]) {
  if (!tags || tags.length === 0) return "";
  return tags.map((t) => `#${t}`).join(" ");
}

export default function VideoCard({ video }: { video: VideoDoc }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [muted, setMuted] = useState(true);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // Intersection observer for autoplay/pause
  useEffect(() => {
    if (!videoRef.current) return;
    const el = videoRef.current;

    const io = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { threshold: 0.75 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    if (isInView) {
      el.play().catch(() => {});
    } else {
      el.pause();
    }
  }, [isInView]);

  // Load initial like/save state
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const likeRef = doc(db, "users", uid, "likes", video.id);
      const saveRef = doc(db, "users", uid, "saved", video.id);
      const [likeSnap, saveSnap] = await Promise.all([
        getDoc(likeRef),
        getDoc(saveRef),
      ]);
      setLiked(likeSnap.exists());
      setSaved(saveSnap.exists());
    })();
  }, [uid, video.id]);

  async function toggleLike() {
    if (!uid) return;
    const ref = doc(db, "users", uid, "likes", video.id);
    if (liked) {
      await deleteDoc(ref);
      setLiked(false);
    } else {
      await setDoc(ref, {
        videoId: video.id,
        title: video.title ?? "",
        url: video.url,
        tags: video.tags ?? [],
        createdAt: video.createdAt ?? serverTimestamp(),
        likedAt: serverTimestamp(),
        poster: video.poster ?? null,
      });
      setLiked(true);
    }
  }

  async function toggleSave() {
    if (!uid) return;
    const ref = doc(db, "users", uid, "saved", video.id);
    if (saved) {
      await deleteDoc(ref);
      setSaved(false);
    } else {
      await setDoc(ref, {
        videoId: video.id,
        title: video.title ?? "",
        url: video.url,
        tags: video.tags ?? [],
        createdAt: video.createdAt ?? serverTimestamp(),
        savedAt: serverTimestamp(),
        poster: video.poster ?? null,
      });
      setSaved(true);
    }
  }

  return (
    <div className="relative w-full max-w-2xl mx-auto my-6">
      <div
        className={`rounded-2xl overflow-hidden shadow-lg transition ring-2 ${
          liked ? "ring-pink-500" : "ring-transparent"
        }`}
      >
        <video
          ref={videoRef}
          src={video.url}
          muted={muted}
          playsInline
          loop
          poster={video.poster}
          className="w-full h-auto bg-black"
          controls={false}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLike}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              liked
                ? "border-pink-500 text-pink-400 shadow-[0_0_12px_#ec4899]"
                : "border-zinc-700 text-zinc-300"
            }`}
            aria-pressed={liked}
          >
            ♥ Like
          </button>

          <button
            onClick={toggleSave}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              saved
                ? "border-emerald-500 text-emerald-400 shadow-[0_0_12px_#10b981]"
                : "border-zinc-700 text-zinc-300"
            }`}
            aria-pressed={saved}
          >
            ⬇ Save
          </button>
        </div>

        <button
          onClick={() => setMuted((m) => !m)}
          className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 text-sm"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>

      {/* Title */}
      {video.title ? (
        <p className="mt-2 text-sm text-zinc-100 font-medium">
          {video.title}
        </p>
      ) : null}

      {/* Hashtags */}
      {video.tags && video.tags.length > 0 ? (
        <p className="text-xs text-zinc-400 mt-1">{joinTags(video.tags)}</p>
      ) : null}
    </div>
  );
}
