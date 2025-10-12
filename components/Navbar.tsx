// components/Navbar.tsx
'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Heart, Home, Upload } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
  useEffect(() => onAuthStateChanged(auth, u => setEmail(u?.email ?? null)), []);

  const Item = ({ href, icon: Icon, label }:{href:string, icon:any, label:string}) => {
    const active = pathname === href;
    return (
      <Link href={href} className={`icon-btn ${active ? "glow" : ""}`} title={label}>
        <Icon />
      </Link>
    );
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-40">
      <div className="flex gap-3 bg-neutral-950/80 px-4 py-3 rounded-full border border-neutral-800 backdrop-blur">
        <Item href="/mainmenu" icon={Home} label="Feed" />
        <Item href="/saved" icon={Heart} label="Saved" />
        <Item href="/admin" icon={Upload} label="Admin" />
        {email && (
          <button
            className="icon-btn"
            onClick={async () => { 
              try { await signOut(auth); } finally { window.location.href = "/login"; }
            }}
            title="Sign out"
          >
            <LogOut />
          </button>
        )}
      </div>
    </div>
  );
}
