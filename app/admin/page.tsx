'use client';

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL, updateMetadata } from "firebase/storage";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
import { useEffect, useState } from "react";

const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function slugify(name: string) {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
}

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const email = auth.currentUser?.email?.toLowerCase();
    setIsAdmin(email ? admins.includes(email) : false);
  }, []);

  const uploadAll = async () => {
    if (!files || files.length === 0) return;

    let uploaded = 0;
    setStatus("Uploading…");
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      // allow only videos
      if (!f.type || !f.type.startsWith("video/")) {
        console.warn("Skipping non-video file:", f.name, f.type);
        continue;
      }

      const safeName = slugify(f.name);
      const path = `videos/${Date.now()}-${i}-${safeName}`;
      const storageRef = ref(storage, path);

      try {
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, f, {
            // IMPORTANT for audio to be recognized
            contentType: f.type || "video/mp4",
          });

          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
              setProgress(pct);
            },
            (err) => reject(err),
            async () => {
              const url = await getDownloadURL(storageRef);
              await addDoc(collection(db, "videos"), {
                url,
                title: safeName.replace(/\.[^/.]+$/, ""),
                hashtags: [],
                createdAt: serverTimestamp(),
              });
              resolve();
            }
          );
        });

        uploaded++;
        setStatus(`Uploaded ${uploaded}/${files.length}`);
      } catch (e: any) {
        console.error("Upload failed:", f.name, e);
        setStatus(`Error on ${f.name}: ${e?.message ?? String(e)}`);
      }
    }

    setStatus(`Done. Videos added. (${uploaded}/${files?.length ?? 0})`);
    setProgress(0);
  };

  // Fix existing video objects: set proper Content-Type on all
  const fixExisting = async () => {
    setStatus("Fixing existing videos…");
    let fixed = 0, skipped = 0, failed = 0;

    try {
      const snap = await getDocs(collection(db, "videos"));
      for (const d of snap.docs) {
        const data = d.data() as any;
        const url: string | undefined = data?.url;
        if (!url) { skipped++; continue; }

        // Build a reference to the object
        let objRef;
        try {
          objRef = ref(storage, url);     // works for https Storage URLs
        } catch {
          // fallback: derive the path from the URL
          const encoded = url.split("/o/")[1]?.split("?")[0]; // videos%2Ffile.mp4
          if (!encoded) { skipped++; continue; }
          const objectPath = decodeURIComponent(encoded);     // videos/file.mp4
          objRef = ref(storage, objectPath);
        }

        try {
          await updateMetadata(objRef, { contentType: "video/mp4" });
          fixed++;
        } catch (e) {
          console.error("updateMetadata failed for", url, e);
          failed++;
        }
      }

      setStatus(`Fix complete. Fixed ${fixed}, skipped ${skipped}, failed ${failed}.`);
    } catch (e: any) {
      console.error("Fix existing error:", e);
      setStatus(`Fix error: ${e?.message ?? String(e)}`);
    }
  };

  if (!isAdmin) {
    return (
      <RequireAuth>
        <div className="p-6">Admin only.</div>
        <Navbar />
      </RequireAuth>
    );
  }

  return (
    <RequireAuth>
      <div className="min-h-screen">
        <div className="pt-6 pb-28">
          <div className="mx-auto max-w-xl px-4 space-y-4">
            <h2 className="text-xl font-bold">Admin Upload</h2>

            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />

            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={uploadAll}>Upload</button>
              <button className="btn" onClick={fixExisting}>Fix existing videos</button>
            </div>

            {progress > 0 && progress < 100 && (
              <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                <div className="h-2 bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
              </div>
            )}

            <div className="text-sm opacity-80">{status}</div>

            <p className="text-xs opacity-60">
              You can extend this later (e.g., auto-tags/categories) if you want, but it's not required.
            </p>
          </div>
        </div>
        <Navbar />
      </div>
    </RequireAuth>
  );
}
