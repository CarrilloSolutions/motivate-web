'use client';

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Bookmark } from "lucide-react";
import { auth, db, storage } from "@/lib/firebase";                 // ⬅️ add storage
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref as sRef, getBlob } from "firebase/storage";             // ⬅️ Storage SDK

type VideoItem = {
  id: string;
  url: string;         // can be https download URL or gs:// or a path
  title?: string;
  hashtags?: string[];
  createdAt?: any;
};

export default function VideoCard({ item }: { item: VideoItem }) {
  const ref = useRef<HTMLVideoElement>(null);

  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  // audio state
  const [muted, setMuted] = useState(true);   // start muted so autoplay works
  const [playing, setPlaying] = useState(true);

  // ---- NEW: a local src we control (blob URL) ----
  const [src, setSrc] = useState<string | null>(null);

  // Remember user's unmute preference
  useEffect(() => {
    const pref =
      typeof window !== "undefined" &&
      localStorage.getItem("motivate_unmuted") === "1";
    if (pref) setMuted(false);
  }, []);

  // Attach canplay to show/hide loader
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCanPlay = () => setLoading(false);
    el.addEventListener("canplay", onCanPlay);
    return () => el.removeEventListener("canplay", onCanPlay);
  }, []);

  // ---- NEW: Fetch bytes via Storage SDK (App Check-friendly) ----
  useEffect(() => {
    let cancelled = false;
    let objectUrl: string | null = null;

    setLoading(true);
    setSrc(null);

    // `ref` can take a gs://, https download URL, or a storage path
    const r = sRef(storage, item.url);

    getBlob(r)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch((err) => {
        console.warn("getBlob failed; falling back to direct URL:", err);
        // Fallback to original URL (will still work if Storage is NOT enforced)
        if (!cancelled) setSrc(item.url);
      })
      .finally(() => {
        if (!cancelled) {
          // canplay will turn off loading; keep a safe default turn-off as well
          // in case onCanPlay doesn't fire (e.g., error)
          setTimeout(() => !cancelled && setLoading(false), 150);
        }
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [item.url]);

  // Play/pause based on visibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach(async (entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.95) {
            try {
              await el.play();
              setPlaying(true);
            } catch {
              /* ignore */
            }
          } else {
            el.pause();
            setPlaying(false);
          }
        });
      },
      { threshold: [0.0, 0.25, 0.5, 0.75, 0.95, 1] }
    );

    io.observe(el);
    return () => io.disconnect();
  }, []);

  const user = () => auth.currentUser;

  const toggle = async (kind: "like" | "save") => {
    const u = user();
    if (!u) {
      alert("Please log in first.");
      return;
    }

    const flag = kind === "like" ? liked : saved;
    const setFlag = kind === "like" ? setLiked : setSaved;
    const path = doc(
      db,
      "users",
      u.uid,
      kind === "like" ? "likes" : "saved",
      item.id
    );

    if (flag) {
      await deleteDoc(path);
      setFlag(false);
    } else {
      await setDoc(path, { videoId: item.id, at: serverTimestamp() });
      setFlag(true);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  };

  // --- audio controls ---
  const handleUnmute = async () => {
    const el = ref.current;
    if (!el) return;
    try {
      el.muted = false;
      el.volume = 1;
      await el.play(); // user gesture -> allowed with sound
      setMuted(false);
      setPlaying(true);
      localStorage.setItem("motivate_unmuted", "1");
    } catch {
      /* ignore */
    }
  };

  const toggleMute = () => {
    const el = ref.current;
    if (!el) return;
    if (muted) {
      void handleUnmute();
    } else {
      el.muted = true;
      setMuted(true);
    }
  };

  const handleVideoClick = () => {
    const el = ref.current;
    if (!el) return;
    if (muted) {
      void handleUnmute();
      return;
    }
    if (el.paused) {
      el.play();
      setPlaying(true);
    } else {
      el.pause();
      setPlaying(false);
    }
  };
  // ----------------------

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="card p-0 overflow-hidden">
        <video
          ref={ref}
          src={src ?? ""}                              // ⬅️ use blob URL when ready
          className="w-full h-[70vh] object-cover"
          style={{ scrollSnapAlign: "center" }}
          loop
          autoPlay
          muted={muted}
          playsInline
          preload="metadata"
          controls={false}
          onClick={handleVideoClick}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            loading...
          </div>
        )}

        <button
          onClick={toggleMute}
          className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1.5 rounded-full"
        >
          {muted ? "Unmute 🔊" : "Mute 🔇"}
        </button>

        {!playing && !loading && (
          <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-1 rounded">
            Paused
          </div>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm opacity-80">
          <div className="font-semibold">{item.title ?? "Motivation"}</div>
          {!!item.hashtags?.length && (
            <div className="text-xs">
              {item.hashtags.map((h) => `#${h}`).join(" ")}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            animate={
              liked
                ? { scale: [1, 1.2, 1], boxShadow: "0 0 20px rgba(0,255,127,.6)" }
                : {}
            }
            onClick={() => toggle("like")}
            className={`icon-btn ${liked ? "glow" : ""}`}
            aria-label="Like"
          >
            <Heart />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            animate={
              saved
                ? { scale: [1, 1.2, 1], boxShadow: "0 0 20px rgba(0,255,127,.6)" }
                : {}
            }
            onClick={() => toggle("save")}
            className={`icon-btn ${saved ? "glow" : ""}`}
            aria-label="Save"
          >
            <Bookmark />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
