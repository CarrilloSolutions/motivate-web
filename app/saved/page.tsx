'use client';
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import { auth, db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query, limit, doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";

type SavedItem = { id:string; videoId:string; at:any; video?: { url:string; title?:string } };

export default function SavedPage() {
  const [items, setItems] = useState<SavedItem[]>([]);

  useEffect(() => {
    (async () => {
      const u = auth.currentUser;
      if (!u) return;
      const q = query(collection(db, "users", u.uid, "saved"), orderBy("at", "desc"), limit(60));
      const snap = await getDocs(q);
      const rows: SavedItem[] = [];
      for (const d of snap.docs) {
        const data = d.data() as any;
        const vdoc = await getDoc(doc(db, "videos", data.videoId));
        rows.push({ id: d.id, videoId: data.videoId, at: data.at, video: vdoc.exists() ? (vdoc.data() as any) : undefined });
      }
      setItems(rows);
    })();
  }, []);

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <div className="pt-6 pb-28">
          <div className="mx-auto max-w-4xl px-4">
            <h2 className="text-xl font-bold mb-4">Saved</h2>
            <div className="grid grid-cols-3 gap-3">
              {items.map(it => (
                <a key={it.id} href={`/mainmenu?s=${encodeURIComponent(it.videoId)}`} className="block">
                  <div className="aspect-[9/16] bg-neutral-900 rounded-xl overflow-hidden flex items-center justify-center text-xs opacity-80">
                    {it.video?.title ?? "Video"}
                  </div>
                </a>
              ))}
            </div>
            {items.length === 0 && <div className="opacity-70">No saved videos yet.</div>}
          </div>
        </div>
        <Navbar />
      </div>
    </RequireAuth>
  );
}
