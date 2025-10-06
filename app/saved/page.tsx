"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import VideoCard from "@/components/VideoCard";
import RandomBackgroundVideo from "@/components/RandomBackgroundVideo";

type SavedDoc = {
  videoId: string;
  url: string;
  title?: string;
  tags?: string[];
  createdAt?: any;
  savedAt?: any;
  poster?: string | null;
};

export default function SavedPage() {
  const [uid, setUid] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedDoc[]>([]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUid(u?.uid ?? null));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "users", uid, "saved"), orderBy("savedAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => d.data() as SavedDoc);
      setSaved(list);
    });
    return () => unsub();
  }, [uid]);

  return (
    <div className="relative">
      <RandomBackgroundVideo />
      <div className="relative z-10 px-4 pt-8 pb-16">
        <h1 className="text-xl font-semibold text-zinc-100 mb-4">Saved</h1>
        {!uid ? (
          <p className="text-zinc-400">Sign in to see saved videos.</p>
        ) : saved.length === 0 ? (
          <p className="text-zinc-400">No saved videos yet.</p>
        ) : (
          saved.map((s) => (
            <VideoCard
              key={s.videoId}
              video={{
                id: s.videoId,
                url: s.url,
                title: s.title,
                tags: s.tags ?? [],
                createdAt: s.createdAt,
                poster: s.poster ?? undefined,
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
