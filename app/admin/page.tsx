'use client';
import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import { auth, db, storage } from "@/lib/firebase";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useEffect, useState } from "react";

const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const email = auth.currentUser?.email?.toLowerCase();
    setIsAdmin(email ? admins.includes(email) : false);
  }, []);

  const uploadAll = async () => {
    if (!files || files.length === 0) return;
    setStatus("Uploading...");
    for (let i=0; i<files.length; i++) {
      const f = files[i];
      const path = `videos/${Date.now()}-${f.name}`;
      const storageRef = ref(storage, path);
      await new Promise<void>((resolve, reject) => {
        const task = uploadBytesResumable(storageRef, f);
        task.on("state_changed", () => {}, reject, async () => {
          const url = await getDownloadURL(storageRef);
          await addDoc(collection(db, "videos"), {
            url, title: f.name.replace(/\.[^/.]+$/, ""), hashtags: [], createdAt: serverTimestamp()
          });
          resolve();
        });
      });
    }
    setStatus("Done. Videos added.");
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
            <input type="file" accept="video/*" multiple onChange={(e)=>setFiles(e.target.files)} />
            <button className="btn btn-primary" onClick={uploadAll}>Upload</button>
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
