'use client';
import { useState } from "react";
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import { db, storage } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { ref, updateMetadata } from "firebase/storage";

export default function FixPage() {
  const [status, setStatus] = useState("");

  const fixExisting = async () => {
    setStatus("Fixing existing videos…");
    let fixed = 0, skipped = 0, failed = 0;
    try {
      const snap = await getDocs(collection(db, "videos"));
      for (const d of snap.docs) {
        const data = d.data() as any;
        const url: string | undefined = data?.url;
        if (!url) { skipped++; continue; }

        let objRef;
        try {
          objRef = ref(storage, url);
        } catch {
          const encoded = url.split("/o/")[1]?.split("?")[0];
          if (!encoded) { skipped++; continue; }
          objRef = ref(storage, decodeURIComponent(encoded));
        }

        try { await updateMetadata(objRef, { contentType: "video/mp4" }); fixed++; }
        catch { failed++; }
      }
      setStatus(`Fix complete. Fixed ${fixed}, skipped ${skipped}, failed ${failed}.`);
    } catch (e: any) {
      setStatus(`Fix error: ${e?.message ?? String(e)}`);
    }
  };

  return (
    <RequireAuth>
      <div className="min-h-screen pt-6 pb-28">
        <div className="mx-auto max-w-xl px-4 space-y-4">
          <h2 className="text-xl font-bold">Fix Existing Videos</h2>
          <button className="btn" onClick={fixExisting}>Run Fix</button>
          <div className="text-sm opacity-80">{status}</div>
        </div>
      </div>
      <Navbar />
    </RequireAuth>
  );
}