"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc as fdoc,
  setDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { ref as sref, deleteObject } from "firebase/storage";

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

const admins =
  (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

export default function VideoCard({
  video,
  active = false,
  onEnded,
  defaultMuted = false,
}: Props) {
  const vref = useRef<HTMLVideoElement | null>(null);

  // auth state
  const [uid, setUid] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);

  // audio / playback prefs
  const [muted, setMuted] = useState<boolean>(defaultMuted);
  const [autoplayForcedMute, setAutoplayForcedMute] = useState(false);
  const [broken, setBroken] = useState(false);

  // user flags
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // ---- auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
      setEmail(u?.email ?? null);
    });
    return () => unsub();
  }, []);

  const isAdminEmail =
    email ? admins.includes(email.toLowerCase()) : false;

  // ---- restore mute preference once
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("mutedPref") : null;
    if (stored !== null) setMuted(stored === "true");
  }, []);

  // keep element in sync when state changes
  useEffect(() => {
    const el = vref.current;
    if (el) el.muted = muted;
  }, [muted]);

  // ---- play/pause based on "active" card
  useEffect(() => {
    const el = vref.current;
    if (!el) return;

    if (active) {
      el.muted = muted;
      el.play().catch(() => {
        // autoplay with sound may be blocked; retry muted once
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

  // ---- tap video to pause/play, also lift forced mute
  const onVideoTap = () => {
    const el = vref.current;
    if (!el) return;

    if (autoplayForcedMute) {
      setAutoplayForcedMute(false);
      setMuted(false);
      localStorage.setItem("mutedPref", "false");
      el.muted = false;
      el.play().catch(() => {});
      return;
    }

    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  // ---- toggle mute, persist preference
  function toggleMute() {
    const next = !muted;
    setMuted(next);
    localStorage.setItem("mutedPref", next ? "true" : "false");
    const el = vref.current;
    if (el) el.muted = next;
  }

  // ---- initial like/save flags
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const likeRef = fdoc(db, "users", uid, "likes", video.id);
      const saveRef = fdoc(db, "users", uid, "saved", video.id);
      const [likeSnap, saveSnap] = await Promise.all([getDoc(likeRef), getDoc(saveRef)]);
      setLiked(likeSnap.exists());
      setSaved(saveSnap.exists());
    })();
  }, [uid, video.id]);

  async function toggleLike() {
    if (!uid) return;
    const ref = fdoc(db, "users", uid, "likes", video.id);
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
    const ref = fdoc(db, "users", uid, "saved", video.id);
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

  // ---- ADMIN: delete current video (doc + storage object)
  async function adminDeleteVideo() {
    if (!isAdminEmail) return;

    // 1) delete Firestore document
    await deleteDoc(fdoc(db, "videos", video.id)).catch(() => {});

    // 2) delete Storage object
    try {
      let objectRef = sref(storage, video.url); // works for gs:// or download URLs
      // Some SDKs throw on https URLs; fall back to path decode:
      if (!objectRef) throw new Error("bad ref");

      await deleteObject(objectRef);
    } catch {
      try {
        const enc = video.url.split("/o/")[1]?.split("?")[0];
        if (enc) {
          const path = decodeURIComponent(enc); // videos/file.mp4
          await deleteObject(sref(storage, path));
        }
      } catch {
        // ignore if already missing
      }
    }

    // Optional: move to next item
    onEnded?.();
  }

  return (
    <div className="snap-start flex flex-col items-center py-6 min-h-screen relative z-10">
      <div className="w-[min(90vw,720px)] rounded-3xl overflow-hidden ring-4 ring-white/10 bg-black/60 shadow-xl relative">
        {/* Admin-only delete button */}
        {isAdminEmail && (
          <button
            onClick={adminDeleteVideo}
            className="absolute top-2 right-2 z-30 rounded-full bg-black/60 border border-white/20 px-2 py-1 text-xs text-white"
            title="Delete video"
          >
            ✕
          </button>
        )}

        <video
          ref={vref}
          src={video.url}
          poster={video.poster}
          playsInline
          loop={false}
          controls={false}
          className="w-full h-auto bg-black"
          onEnded={() => onEnded?.()}
          onClick={onVideoTap}
          onKeyDown={(e) => {
            if (e.key === " " || e.key === "Enter") {
              e.preventDefault();
              onVideoTap();
            }
          }}
          onError={() => setBroken(true)}
          tabIndex={0}
        />
      </div>

      <div className="mt-3 w-[min(90vw,720px)] flex items-center justify-between gap-3 relative z-20 pointer-events-auto">
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
              {(video.tags ?? video.hashtags ?? [])
                .map((t) => `#${t}`)
                .join(" ")}
            </p>
          ) : null}
        </div>
      )}

      {broken && (
        <div className="w-[min(90vw,720px)] mt-2 text-xs text-red-400">
          This video file is unavailable.{isAdminEmail ? " You can remove it with the ✕ button." : ""}
        </div>
      )}
    </div>
  );
}
