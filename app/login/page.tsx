'use client';
import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendPasswordResetEmail } from "firebase/auth";

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

  const login = async () => {
    setLoading(true);
    setMessage("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (navigator.vibrate) navigator.vibrate([10, 30]);
    } catch (e:any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const create = async () => {
    setLoading(true);
    setMessage("");
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
    } catch (e:any) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    if (!email) { setMessage("Enter your email to reset."); return; }
    await sendPasswordResetEmail(auth, email);
    setMessage("Password reset sent.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
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
          <button onClick={login} className="btn btn-primary w-full" disabled={loading}>
            {loading ? "..." : "Log In"}
          </button>
          <button onClick={create} className="btn btn-secondary w-full" disabled={loading}>
            Create Account
          </button>
          <button onClick={reset} className="text-sm underline underline-offset-4 opacity-80">
            Forgot password?
          </button>
          {message && <div className="text-xs text-red-400">{message}</div>}
        </div>
      </div>
    </div>
  );
}
