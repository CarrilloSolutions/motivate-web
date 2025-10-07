'use client';
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Heart, Home, Upload } from "lucide-react";
import { auth } from "@/lib/firebase";
import { signOut, onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, MouseEvent } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    return onAuthStateChanged(auth, u => setEmail(u?.email ?? null));
  }, []);

  const Item = ({
    href,
    icon: Icon,
    label,
    onClick,
  }: {
    href: string;
    icon: any;
    label: string;
    onClick?: (e: MouseEvent<HTMLAnchorElement>) => void;
  }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        onClick={onClick}
        className={`icon-btn ${active ? "glow" : ""}`}
        title={label}
      >
        <Icon />
      </Link>
    );
  };

  // If already on /mainmenu, clicking Home will hard-refresh the page (refreshes the feed)
  const handleHomeClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (pathname === "/mainmenu") {
      e.preventDefault();
      // optional: scroll to top before reload so snap starts at first card
      window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
      window.location.reload();
    }
    // else: let Link do a normal client-side navigation
  };

  return (
    <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center gap-4 z-50">
      <div className="flex gap-3 bg-neutral-950/80 px-4 py-3 rounded-full border border-neutral-800">
        <Item href="/mainmenu" icon={Home} label="Feed" onClick={handleHomeClick} />
        <Item href="/saved" icon={Heart} label="Saved" />
        <Item href="/admin" icon={Upload} label="Admin" />
        {email && (
          <button
            className="icon-btn"
            onClick={async () => {
              try {
                await signOut(auth);
              } finally {
                window.location.href = "/login";
              }
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
