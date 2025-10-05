'use client';
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Heart, Bookmark } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

type VideoItem = {
  id: string;
  url: string;
  title?: string;
  hashtags?: string[];
  createdAt?: any;
};

export default function VideoCard({ item }: { item: VideoItem }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onCanPlay = () => setLoading(false);
    el.addEventListener('canplay', onCanPlay);
    return () => el.removeEventListener('canplay', onCanPlay);
  }, []);

  // Play/pause based on visibility
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.95) {
          el.play().catch(()=>{});
        } else {
          el.pause();
        }
      });
    }, { threshold: [0.0, 0.25, 0.5, 0.75, 0.95, 1] });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const user = () => auth.currentUser;

  const toggle = async (kind: "like"|"save") => {
    const u = user();
    if (!u) { alert("Please log in first."); return; }
    const flag = kind === "like" ? liked : saved;
    const setFlag = kind === "like" ? setLiked : setSaved;
    const path = doc(db, "users", u.uid, kind === "like" ? "likes" : "saved", item.id);
    if (flag) {
      await deleteDoc(path);
      setFlag(false);
    } else {
      await setDoc(path, { videoId: item.id, at: serverTimestamp() });
      setFlag(true);
      // Try light haptics
      if (navigator.vibrate) navigator.vibrate(15);
    }
  };

  return (
    <div className="relative w-full max-w-xl mx-auto">
      <div className="card p-0 overflow-hidden">
        <video
          ref={ref}
          src={item.url}
          controls={false}
          muted
          playsInline
          loop
          className="w-full h-[70vh] object-cover"
          style={{ scrollSnapAlign: "center" }}
        />
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center text-white/70 text-sm">
            loading...
          </div>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-sm opacity-80">
          <div className="font-semibold">{item.title ?? "Motivation"}</div>
          {item.hashtags && item.hashtags.length > 0 && (
            <div className="text-xs">{item.hashtags.map(h=>`#${h}`).join(" ")}</div>
          )}
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            animate={liked ? { scale: [1,1.2,1], boxShadow: "0 0 20px rgba(0,255,127,.6)" } : {}}
            onClick={() => toggle("like")}
            className={`icon-btn ${liked ? "glow" : ""}`}
            aria-label="Like"
          >
            <Heart />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            animate={saved ? { scale: [1,1.2,1], boxShadow: "0 0 20px rgba(0,255,127,.6)" } : {}}
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
