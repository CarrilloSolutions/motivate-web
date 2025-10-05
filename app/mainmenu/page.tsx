'use client';
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import VideoCard from "@/components/VideoCard";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { useEffect, useState } from "react";

type VideoItem = { id:string; url:string; title?:string; hashtags?:string[] };

export default function MainMenu() {
  const [items, setItems] = useState<VideoItem[]>([]);

  useEffect(() => {
    (async () => {
      const q = query(collection(db, "videos"), orderBy("createdAt", "desc"), limit(25));
      const snap = await getDocs(q);
      const rows = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
      setItems(rows as any);
    })();
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <div className="pt-6 pb-28">
          <div className="mx-auto max-w-xl px-4">
            <h2 className="text-xl font-bold mb-3">Today's Motivation</h2>
            <div className="snap-y snap-mandatory overflow-y-auto h-[80vh] space-y-10">
              {items.map(item => (
                <div key={item.id} className="snap-center">
                  <VideoCard item={item} />
                </div>
              ))}
              {items.length === 0 && <div className="opacity-70">No videos yet. Add some in Admin.</div>}
            </div>
          </div>
        </div>
        <Navbar />
      </div>
    </RequireAuth>
  );
}
