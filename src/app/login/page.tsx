"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    window.location.href = "/";
  };

  return (
    <div className="card max-w-md mx-auto mt-16">
      <h1 className="display text-2xl mb-4">Sign in</h1>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <span className="label">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" required />
        </div>
        <div>
          <span className="label">Password</span>
          <div className="relative">
            <input
              className="input pr-14"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              minLength={6}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-steel hover:text-coral"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {err && <p className="text-sm text-alarm">{err}</p>}
        <button type="submit" className="btn w-full justify-center" disabled={!email || password.length < 6 || busy}>
          {busy ? "Please wait…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
