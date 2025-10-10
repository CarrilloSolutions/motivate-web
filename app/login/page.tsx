// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import RandomBackgroundVideo from "@/components/RandomBackgroundVideo";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  // If already signed in, go to main feed
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) router.replace("/mainmenu");
    });
    return () => unsub();
  }, [router]);

  async function handleContinue(e?: React.FormEvent) {
    e?.preventDefault();
    setStatus("");

    // simple validation
    if (!email || !password) {
      setStatus("Enter your email and password to continue.");
      return;
    }

    setLoading(true);
    try {
      // 1) Try to sign in
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace("/mainmenu");
    } catch (err: any) {
      // 2) If user doesn't exist, create account automatically
      if (err?.code === "auth/user-not-found") {
        try {
          await createUserWithEmailAndPassword(auth, email.trim(), password);
          router.replace("/mainmenu");
          return;
        } catch (createErr: any) {
          // common signup errors
          if (createErr?.code === "auth/weak-password") {
            setStatus("Password is too weak. Try at least 6 characters.");
          } else if (createErr?.code === "auth/invalid-email") {
            setStatus("That email looks invalid.");
          } else if (createErr?.code === "auth/email-already-in-use") {
            setStatus("This email is already registered. Please try again.");
          } else {
            setStatus(`Signup failed: ${createErr?.message ?? String(createErr)}`);
          }
        }
      } else if (err?.code === "auth/invalid-email") {
        setStatus("That email looks invalid.");
      } else if (err?.code === "auth/wrong-password") {
        setStatus("Incorrect password. Please try again.");
      } else {
        setStatus(`Sign-in failed: ${err?.message ?? String(err)}`);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative min-h-screen">
      <RandomBackgroundVideo />
      <div className="relative z-10 px-4 pt-12 pb-28 flex items-start justify-center">
        <form
          onSubmit={handleContinue}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-black/50 backdrop-blur p-6 shadow-xl"
        >
          <h1 className="text-2xl font-semibold text-white mb-2">Welcome back</h1>
          <p className="text-sm text-zinc-400 mb-6">
            One button. If your email exists, we’ll sign you in. If not, we’ll create your account.
          </p>

          <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">
            Email
          </label>
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-4 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-zinc-500"
          />

          <div className="flex items-center justify-between">
            <label className="block text-xs uppercase tracking-wide text-zinc-400 mb-1">
              Password
            </label>
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                className="accent-emerald-500"
                checked={showPw}
                onChange={(e) => setShowPw(e.target.checked)}
              />
              Show
            </label>
          </div>

          <input
            type={showPw ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••"
            className="mb-4 w-full rounded-md bg-white/5 border border-white/10 px-3 py-2 text-white placeholder-zinc-500"
          />

          {/* Helper hint for folks who click with empty fields */}
          {!email && !password && (
            <div className="text-xs text-zinc-400 mb-3">
              Tip: Enter an email + password and press <span className="text-zinc-200">Continue</span>.  
              We’ll create your account automatically if it’s your first time.
            </div>
          )}

          {status && (
            <div className="mb-3 text-sm text-amber-300">
              {status}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            onClick={handleContinue}
            className="btn btn-primary w-full disabled:opacity-60"
          >
            {loading ? "Please wait…" : "Continue"}
          </button>

          <p className="mt-3 text-xs text-zinc-500">
            By continuing you agree to our Terms. You can change your info anytime.
          </p>
        </form>
      </div>

      <Navbar />
    </div>
  );
}
