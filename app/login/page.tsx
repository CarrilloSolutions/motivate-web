// app/login/page.tsx
'use client';

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import RandomBackgroundVideo from "@/components/RandomBackgroundVideo";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      if (u) window.location.href = "/mainmenu";
    });
  }, []);

  // Single button: try sign-in; if user doesn't exist, create account
  const continueLoginOrCreate = async () => {
    setLoading(true);
    setMessage("");

    if (!email || !password) {
      setMessage("Enter your email and password to continue.");
      setLoading(false);
      return;
    }

    try {
      // 1) Try to sign in
      await signInWithEmailAndPassword(auth, email, password);
      if (navigator.vibrate) navigator.vibrate([10, 30]); // original login haptic
    } catch (e: any) {
      // 2) If no such user, create account
      if (e?.code === "auth/user-not-found") {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          if (navigator.vibrate) navigator.vibrate([10, 30, 10]); // original create haptic
        } catch (createErr: any) {
          setMessage(createErr?.message ?? String(createErr));
          setLoading(false);
          return;
        }
      } else {
        // Other sign-in errors (wrong password, invalid email, etc.)
        setMessage(e?.message ?? String(e));
        setLoading(false);
        return;
      }
    }

    setLoading(false);
  };

  const reset = async () => {
    if (!email) { setMessage("Enter your email to reset."); return; }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset sent.");
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* background looping video behind everything */}
      <RandomBackgroundVideo
        sources={[
          "/bg/3595-172488292.mp4",
          "/bg/19873-908438835.mp4",
          "/bg/217763_tiny.mp4",
          "/bg/2337-157269912.mp4",
          "/bg/243156_medium.mp4",
          "/bg/230724.mp4",
        ]}
        poster="/bg/fallback.jpg"
        overlay
      />

      {/* original login UI, unchanged */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold tracking-tight">Motivate</h1>
            <p className="opacity-70 mt-1">Real inspiration at will.</p>
          </div>
          <div className="card space-y-3">
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); if (navigator.vibrate) navigator.vibrate(5); }}
              className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-black placeholder-black"
              style={{ color: "black", backgroundColor: "white" }}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (navigator.vibrate) navigator.vibrate(5); }}
              className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-black placeholder-black"
              style={{ color: "black", backgroundColor: "white" }}
            />

            {/* Single button: Log In / Create Account */}
            <button
              onClick={continueLoginOrCreate}
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "..." : "Log In / Create Account"}
            </button>

            {/* Forgot password (unchanged) */}
            <button onClick={reset} className="text-sm underline underline-offset-4 opacity-80">
              Forgot password?
            </button>

            {message && <div className="text-xs text-red-400">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
