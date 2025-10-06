// app/mainmenu/page.tsx
"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import VideoCard from "@/components/VideoCard";
import RandomBackgroundVideo from "@/components/RandomBackgroundVideo";

type VideoDoc = {
  id: string;
  url: string;
  title?: string;
  tags?: string[];
  hashtags?: string[]; // tolerate either field
  createdAt?: any;
  poster?: string;
};

export default function MainMenuPage() {
  const [videos, setVideos] = useState<VideoDoc[]>([]);

  useEffect(() => {
    const q = query(collection(db, "videos"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as VideoDoc[];
      setVideos(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="relative">
      <RandomBackgroundVideo />
      <div className="relative z-10 px-4 pt-8 pb-16">
        <h1 className="text-xl font-semibold text-zinc-100 mb-4">Today's Motivation</h1>
        {videos.map((v) => (
          <VideoCard
            key={v.id}
            video={{
              ...v,
              // normalize tags so VideoCard can show them
              tags: (v.tags && v.tags.length ? v.tags : v.hashtags) ?? [],
            }}
          />
        ))}
      </div>
    </div>
  );
}
