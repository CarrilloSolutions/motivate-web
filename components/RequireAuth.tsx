'use client';
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function RequireAuth({ children }:{children: React.ReactNode}) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setOk(!!u);
      if (!u) window.location.href = "/login";
    });
  }, []);
  if (ok === null) return <div className="p-6">...</div>;
  if (!ok) return null;
  return <>{children}</>;
}
