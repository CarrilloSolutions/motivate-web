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
  const [toast, setToast] = useState("");
  const [wrongAttempts, setWrongAttempts] = useState(0);

  // Redirect if already signed in
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u) window.location.href = "/mainmenu";
    });
  }, []);

  // tiny toast helper (no haptics)
  const showToast = (text: string, ms = 3000) => {
    setToast(text);
    window.setTimeout(() => setToast(""), ms);
  };

  // ----- Actions -----
  const login = async () => {
    setLoading(true);
    setMessage("");

    if (!email || !password) {
      setMessage("Enter your email and password to continue.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      setWrongAttempts(0);
    } catch (e: any) {
      const code = String(e?.code || "");
      if (
        code === "auth/wrong-password" ||
        code === "auth/invalid-credential" ||
        code === "auth/invalid-login-credentials"
      ) {
        const next = wrongAttempts + 1;
        setWrongAttempts(next);
        showToast("Wrong password. Try again.");
        if (next >= 3) {
          showToast('Having trouble? Tap "Forgot password?" to reset.', 3500);
        }
      } else if (code === "auth/user-not-found") {
        // make sure we clearly say it's not a valid account
        setMessage("No account found for this email. You can create one below.");
      } else {
        setMessage(e?.message ?? String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setLoading(true);
    setMessage("");

    if (!email || !password) {
      showToast("Enter your email and password to create an account.");
      setLoading(false);
      return;
    }

    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setWrongAttempts(0);
    } catch (e: any) {
      const code = String(e?.code || "");
      if (code === "auth/email-already-in-use") {
        setMessage(
          "An account already exists for this email. Try logging in or use “Forgot password?”."
        );
      } else if (code === "auth/weak-password") {
        setMessage("Password is too weak. Try a stronger password.");
      } else if (code === "auth/invalid-email") {
        setMessage("That email looks invalid. Please check and try again.");
      } else {
        setMessage(e?.message ?? String(e));
      }
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!email) {
      setMessage("Enter your email to reset.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage("Password reset sent.");
      showToast("Check your inbox for a reset link.");
    } catch (e: any) {
      setMessage(e?.message ?? String(e));
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background loop (unchanged look/behavior) */}
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

      {/* toast */}
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-black/80 text-white text-sm border border-white/10 shadow"
          role="status"
        >
          {toast}
        </div>
      )}

      {/* Auth card */}
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
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-black placeholder-black"
              style={{ color: "black", backgroundColor: "white" }}
            />
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black border border-neutral-700 rounded-xl px-4 py-3 text-black placeholder-black"
              style={{ color: "black", backgroundColor: "white" }}
            />

            {/* TWO SEPARATE BUTTONS */}
            <button
              onClick={login}
              className="btn btn-primary w-full"
              disabled={loading}
            >
              {loading ? "..." : "Log In"}
            </button>

            <button
              onClick={create}
              className="btn btn-secondary w-full"
              disabled={loading}
            >
              Create Account
            </button>

            <button
              onClick={reset}
              className="text-sm underline underline-offset-4 opacity-80"
            >
              Forgot password?
            </button>

            {message && <div className="text-xs text-red-400">{message}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
