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

  // Single button flow: try sign-in, if user not found -> create account
  const continueLoginOrCreate = async () => {
    setLoading(true);
    setMessage("");

    if (!email || !password) {
      setMessage("Enter your email and password to continue.");
      setLoading(false);
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (navigator.vibrate) navigator.vibrate([10, 30]); // your original login haptic
    } catch (e: any) {
      // If the user doesn't exist, create the account
      if (e?.code === "auth/user-not-found") {
        try {
          await createUserWithEmailAndPassword(auth, email, password);
          if (navigator.vibrate) navigator.vibrate([10, 30, 10]); // your original create haptic
        } catch (createErr: any) {
          setMessage(createErr?.message ?? String(createErr));
          setLoading(false);
          return;
        }
      } else {
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
      {/* Background looping video behind everything */}
      <RandomBackgroundVideo />

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

            {/* Single button replaces separate Log In / Create Account */}
            <button onClick={continueLoginOrCreate} className="btn btn-primary w-full" disabled={loading}>
              {loading ? "..." : "Continue"}
            </button>

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
