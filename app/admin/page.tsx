"use client";

import RequireAuth from "@/components/RequireAuth";
import Navbar from "@/components/Navbar";
import { auth, db, storage } from "@/lib/firebase";
import {
  ref,
  uploadBytesResumable,
  getDownloadURL,
  updateMetadata,
} from "firebase/storage";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { useEffect, useState } from "react";

const admins = (process.env.NEXT_PUBLIC_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function slugify(name: string) {
  return name.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9._-]/g, "");
}

// "#drive, power focus" -> ["drive","power","focus"]
function parseHashtags(input: string): string[] {
  return Array.from(
    new Set(
      input
        .split(/[\s,]+/)
        .map((s) => s.trim().replace(/^#/, "").toLowerCase())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

type PerFileMeta = {
  name: string;
  title: string;
  hashtagsText: string;
};

export default function AdminPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [perFile, setPerFile] = useState<PerFileMeta[]>([]);
  const [status, setStatus] = useState<string>("");
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    const email = auth.currentUser?.email?.toLowerCase();
    setIsAdmin(email ? admins.includes(email) : false);
  }, []);

  useEffect(() => {
    if (!files?.length) {
      setPerFile([]);
      return;
    }
    setPerFile(
      Array.from(files).map((f) => ({
        name: f.name,
        title: f.name.replace(/\.[^/.]+$/, ""),
        hashtagsText: "",
      }))
    );
  }, [files]);

  const updateMeta = (index: number, patch: Partial<PerFileMeta>) => {
    setPerFile((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const uploadAll = async () => {
    if (!files || files.length === 0) return;

    let uploaded = 0;
    const failures: string[] = [];
    setStatus("Uploading…");
    setProgress(0);

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      if (!f.type?.startsWith("video/")) {
        console.warn("Skipping non-video:", f.name);
        continue;
      }

      const safeName = slugify(f.name);
      const objectPath = `videos/${Date.now()}-${i}-${safeName}`;
      const storageRef = ref(storage, objectPath);

      const meta = perFile[i] ?? {
        name: f.name,
        title: safeName.replace(/\.[^/.]+$/, ""),
        hashtagsText: "",
      };
      const hashtags = parseHashtags(meta.hashtagsText);

      try {
        await new Promise<void>((resolve, reject) => {
          const task = uploadBytesResumable(storageRef, f, {
            contentType: f.type || "video/mp4",
          });

          task.on(
            "state_changed",
            (snap) => {
              const pct = Math.round(
                (snap.bytesTransferred / snap.totalBytes) * 100
              );
              setProgress(pct);
            },
            (err) => {
              console.error("Storage upload error:", err);
              const code = (err as any)?.code ?? "";
              const msg = (err as any)?.message ?? String(err);
              const line = `Storage upload failed for ${f.name}: [${code}] ${msg}`;
              failures.push(line);
              setStatus(line);
              reject(err);
            },
            async () => {
              try {
                await updateMetadata(storageRef, {
                  contentType: f.type || "video/mp4",
                });

                const url = await getDownloadURL(storageRef);

                try {
                  await addDoc(collection(db, "videos"), {
                    url,
                    title: (meta.title || safeName).trim(),
                    hashtags,
                    createdAt: serverTimestamp(),
                  });
                } catch (e: any) {
                  console.error("Firestore addDoc error:", e);
                  const code = e?.code ?? "";
                  const msg = e?.message ?? String(e);
                  const line = `Firestore addDoc failed for ${f.name}: [${code}] ${msg}`;
                  failures.push(line);
                  setStatus(line);
                  reject(e);
                  return;
                }

                resolve();
              } catch (e: any) {
                console.error("Storage finalize error:", e);
                const code = e?.code ?? "";
                const msg = e?.message ?? String(e);
                const line = `Storage finalize failed for ${f.name}: [${code}] ${msg}`;
                failures.push(line);
                setStatus(line);
                reject(e);
              }
            }
          );
        });

        uploaded++;
        setStatus(`Uploaded ${uploaded}/${files.length}`);
      } catch {
        // failure already recorded
      }
    }

    if (failures.length) {
      setStatus(`Done with errors (${uploaded}/${files?.length ?? 0}). Last error: ${failures[failures.length - 1]}`);
    } else {
      setStatus(`Done. Videos added. (${uploaded}/${files?.length ?? 0})`);
    }
    setProgress(0);
    // keep files in the chooser so user can retry failed ones if needed
  };

  const fixExisting = async () => {
    setStatus("Fixing existing videos…");
    let fixed = 0,
      skipped = 0,
      failed = 0;

    try {
      const snap = await getDocs(collection(db, "videos"));
      for (const d of snap.docs) {
        const data = d.data() as any;
        const url: string | undefined = data?.url;
        if (!url) {
          skipped++;
          continue;
        }

        let objRef;
        try {
          objRef = ref(storage, url);
        } catch {
          const encoded = url.split("/o/")[1]?.split("?")[0];
          if (!encoded) {
            skipped++;
            continue;
          }
          objRef = ref(storage, decodeURIComponent(encoded));
        }

        try {
          await updateMetadata(objRef, { contentType: "video/mp4" });
          fixed++;
        } catch (e) {
          console.error("updateMetadata failed for", url, e);
          failed++;
        }
      }

      setStatus(
        `Fix complete. Fixed ${fixed}, skipped ${skipped}, failed ${failed}.`
      );
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
          <div className="mx-auto max-w-3xl px-4 space-y-4">
            <h2 className="text-xl font-bold">Admin Upload</h2>

            <p className="text-xs opacity-70">
              Signed in as: {auth.currentUser?.email} — UID: {auth.currentUser?.uid}
            </p>

            <input
              type="file"
              accept="video/*"
              multiple
              onChange={(e) => setFiles(e.target.files)}
            />

            {perFile.length > 0 && (
              <div className="rounded-xl border border-white/10 p-4 space-y-4">
                {perFile.map((m, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-6 gap-3 items-start"
                  >
                    <div className="md:col-span-2 text-sm opacity-80 truncate">
                      <div className="text-[10px] uppercase opacity-60">File</div>
                      {m.name}
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase opacity-60 block mb-1">
                        Title
                      </label>
                      <input
                        value={m.title}
                        onChange={(e) => updateMeta(idx, { title: e.target.value })}
                        placeholder="e.g., Drive overrides fear."
                        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] uppercase opacity-60 block mb-1">
                        Hashtags
                      </label>
                      <input
                        value={m.hashtagsText}
                        onChange={(e) => updateMeta(idx, { hashtagsText: e.target.value })}
                        placeholder="#drive, #power, #focus"
                        className="w-full rounded-md bg-white/5 border border-white/10 px-3 py-2"
                      />
                      <p className="text-[10px] opacity-60 mt-1">
                        Use commas or spaces. “#” optional (max 20).
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <button className="btn btn-primary" onClick={uploadAll}>
                Upload
              </button>
              <button className="btn" onClick={fixExisting}>
                Fix existing videos
              </button>
            </div>

            {progress > 0 && progress < 100 && (
              <div className="w-full h-2 bg-white/10 rounded overflow-hidden">
                <div
                  className="h-2 bg-emerald-500 transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}

            <div className="text-sm opacity-80">{status}</div>

            <p className="text-xs opacity-60">
              Files are stored in <code>/videos</code> in your Firebase Storage bucket; a document is added in Firestore <code>/videos</code> with title + hashtags.
            </p>
          </div>
        </div>
        <Navbar />
      </div>
    </RequireAuth>
  );
}
