"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";

type VideoDoc = {
  id: string;
  url: string;
  title?: string;
  tags?: string[];
  hashtags?: string[];
  createdAt?: any;
  poster?: string;
};

type Props = {
  video: VideoDoc;
  /** If true, this card should be playing. Optional so /saved can omit it. */
  active?: boolean;
  /** Called when the video ends (used by auto-scroll). */
  onEnded?: () => void;
  /** Start muted? Defaults to false (try to play with sound). */
  defaultMuted?: boolean;
};

export default function VideoCard({
  video,
  active = false,
  onEnded,
  defaultMuted = false,
}: Props) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  // ---- audio handling
  const [muted, setMuted] = useState<boolean>(defaultMuted);
  const [autoplayForcedMute, setAutoplayForcedMute] = useState(false); // if browser blocked sound

  // load stored preference once
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mutedPref") : null;
    if (stored !== null) {
      setMuted(stored === "true");
    }
  }, []);

  // keep element in sync whenever muted state changes
  useEffect(() => {
    const el = vref.current;
    if (el) el.muted = muted;
  }, [muted]);

  // auth
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // play/pause based on active card
  useEffect(() => {
    const el = vref.current;
    if (!el) return;

    if (active) {
      el.muted = muted;
      el.play().catch(() => {
        // Browser blocked autoplay-with-audio → retry muted
        if (!muted) {
          setAutoplayForcedMute(true);
          el.muted = true;
          el.play().catch(() => {});
        }
      });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active, muted]);

  // Tap video to pause/play. If autoplay previously forced mute, first tap enables sound.
  const onVideoTap = () => {
    const el = vref.current;
    if (!el) return;

    if (autoplayForcedMute) {
      setAutoplayForcedMute(false);
      setMuted(false); // enable sound after first user interaction
      localStorage.setItem("mutedPref", "false");
      // try play again with sound
      el.muted = false;
      el.play().catch(() => {});
      return;
    }

    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("mutedPref", next ? "true" : "false");
    const el = vref.current;
    if (el) el.muted = next;
  }

  // initial like/save flags
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const likeRef = doc(db, "users", uid, "likes", video.id);
      const saveRef = doc(db, "users", uid, "saved", video.id);
      const [likeSnap, saveSnap] = await Promise.all([getDoc(likeRef), getDoc(saveRef)]);
      setLiked(likeSnap.exists());
      setSaved(saveSnap.exists());
    })();
  }, [uid, video.id]);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

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
        tags: video.tags ?? video.hashtags ?? [],
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
        tags: video.tags ?? video.hashtags ?? [],
        createdAt: video.createdAt ?? serverTimestamp(),
        savedAt: serverTimestamp(),
        poster: video.poster ?? null,
      });
      setSaved(true);
    }
  }

  return (
    <div className="snap-start flex flex-col items-center py-6 min-h-screen relative z-10">
      <div className="w-[min(90vw,720px)] rounded-3xl overflow-hidden ring-4 ring-white/10 bg-black/60 shadow-xl">
        <video
          ref={vref}
          src={video.url}
          poster={video.poster}
          playsInline
          loop={false}
          controls={false}
          className="w-full h-auto bg-black"
          onEnded={() => onEnded?.()}
          onClick={onVideoTap}                 // ← tap to pause/play (and unforce mute)
          onKeyDown={(e) => {                 // accessibility: Space/Enter
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onVideoTap();
            }
          }}
          tabIndex={0}
        />
      </div>

      {/* ensure buttons are above any overlays and always clickable */}
      <div className="mt-3 w-[min(90vw,720px)] flex items-center justify-between gap-3 relative z-20 pointer-events-auto">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLike}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              liked ? "border-pink-500 text-pink-400 shadow-[0_0_12px_#ec4899]" : "border-zinc-700 text-zinc-300"
            }`}
            aria-pressed={liked}
          >
            ♥ Like
          </button>
          <button
            onClick={toggleSave}
            className={`px-3 py-1.5 rounded-full border text-sm transition ${
              saved ? "border-emerald-500 text-emerald-400 shadow-[0_0_12px_#10b981]" : "border-zinc-700 text-zinc-300"
            }`}
            aria-pressed={saved}
          >
            ⬇ Save
          </button>
        </div>

        <button
          onClick={toggleMute}
          className="px-3 py-1.5 rounded-full border border-zinc-700 text-zinc-300 text-sm"
        >
          {muted ? "Unmute" : "Mute"}
        </button>
      </div>

      {video.title && (
        <div className="w-[min(90vw,720px)] mt-2 relative z-20">
          <p className="text-sm text-zinc-100 font-medium">{video.title}</p>
          {(video.tags?.length || video.hashtags?.length) ? (
            <p className="text-xs text-zinc-400 mt-1">
              {(video.tags ?? video.hashtags ?? []).map((t) => `#${t}`).join(" ")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
