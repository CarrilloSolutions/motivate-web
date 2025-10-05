'use client';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect } from "react";

export default function Page() {
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      window.location.href = u ? "/mainmenu" : "/login";
    });
    return () => unsub();
  }, []);
  return <div className="p-6">Loading...</div>;
}
