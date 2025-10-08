// components/VideoCard.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { auth, db, storage } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc,
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
  active?: boolean;          // if true, auto-play this card
  onEnded?: () => void;      // used by auto-scroll
  defaultMuted?: boolean;    // default false (try to play with sound)
};

// your admin UIDs
function isAdminUid(uid?: string | null) {
  return !!uid && [
    "qVV7S84dwqQa7KZBucDjaXvQJoi2",
    "A8HX7M9zbbQRXj0rVcrVcl2vFM52",
    "djiLQx25Cyg3VeqfhwviT0rgKMc2",
  ].includes(uid);
}

export default function VideoCard({
  video,
  active = false,
  onEnded,
  defaultMuted = false,
}: Props) {
  const vref = useRef<HTMLVideoElement | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(defaultMuted);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  // auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  // set initial like/save flags
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

  // play/pause based on "active"
  useEffect(() => {
    const el = vref.current;
    if (!el) return;
    if (active) {
      el.muted = muted;
      el.play().catch(() => {
        // if autoplay with sound is blocked, retry muted
        if (!muted) {
          el.muted = true;
          el.play().catch(() => {});
        }
      });
    } else {
      el.pause();
      el.currentTime = 0;
    }
  }, [active, muted]);

  // like / save toggles
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

  // ADMIN: delete from feed (and storage) with a clear confirmation,
  // then also remove from THIS user's likes/saved so no ghost cards remain.
  async function deleteAsAdmin() {
    if (!isAdminUid(uid)) return;

    const msg =
      "Delete this video from the public feed?\n\n" +
      "This removes the Firestore /videos doc and tries to delete the Storage file. " +
      "Your own Saved/Liked entries for this video will also be removed.";

    if (!confirm(msg)) return;

    // 1) remove Firestore feed document
    try {
      await deleteDoc(doc(db, "videos", video.id));
    } catch (e) {
      // ignore; continue with storage delete so it's not orphaned
    }

    // 2) delete the storage object (URL or path)
    try {
      const direct = sref(storage, video.url); // works with https:// or gs://
      await deleteObject(direct);
    } catch {
      // derive path from download URL if needed
      const encoded = video.url.split("/o/")[1]?.split("?")[0]; // videos%2Ffile.mp4
      if (encoded) {
        const path = decodeURIComponent(encoded); // videos/file.mp4
        try {
          await deleteObject(sref(storage, path));
        } catch {
          /* ignore */
        }
      }
    }

    // 3) optional cleanup for current user so they don't still see it
    try {
      if (uid) {
        await Promise.allSettled([
          deleteDoc(doc(db, "users", uid, "saved", video.id)),
          deleteDoc(doc(db, "users", uid, "likes", video.id)),
        ]);
      }
    } catch {
      /* ignore */
    }

    alert("Video removed from the feed.\nIf other users saved it previously, their personal copies may still exist.");
  }

  return (
    <div className="snap-start flex flex-col items-center py-6 min-h-screen pb-28">
      <div className="relative w-[min(90vw,720px)] rounded-3xl overflow-hidden ring-4 ring-white/10 bg-black/60 shadow-xl">
        {isAdminUid(uid) && (
          <button
            onClick={deleteAsAdmin}
            className="absolute right-2 top-2 z-50 px-2.5 py-1 rounded-full text-xs bg-black/60 border border-zinc-700 text-zinc-200 hover:bg-black/80"
            title="Delete video from feed"
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
          onClick={() => {
            const el = vref.current;
            if (!el) return;
            el.paused ? el.play().catch(()=>{}) : el.pause();
          }}
        />
      </div>

      {/* controls sit above the nav */}
      <div className="mt-3 w-[min(90vw,720px)] flex items-center justify-between gap-3 z-50">
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

      {video.title && (
        <div className="w-[min(90vw,720px)] mt-2 z-50">
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
