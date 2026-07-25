"use client";
import { useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    const supabase = supabaseBrowser();

    if (mode === "signup") {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) { setErr(error.message); setBusy(false); return; }
      if (!data.session) {
        setErr("Almost there — Supabase still has email confirmation turned on. See the setup note below to turn it off, then try again.");
        setBusy(false);
        return;
      }
      fetch("/api/auth/welcome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }).catch(() => {});
      window.location.href = "/";
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setErr(error.message); setBusy(false); return; }
    window.location.href = "/";
  };

  return (
    <div className="card max-w-md mx-auto mt-16">
      <div className="flex gap-4 mb-4 text-sm">
        <button className={mode === "signin" ? "font-medium text-pine" : "text-steel"} onClick={() => { setMode("signin"); setErr(null); }}>Sign in</button>
        <button className={mode === "signup" ? "font-medium text-pine" : "text-steel"} onClick={() => { setMode("signup"); setErr(null); }}>Create account</button>
      </div>
      <h1 className="display text-2xl mb-4">{mode === "signup" ? "Create your account" : "Sign in"}</h1>
      <div className="space-y-3">
        <div>
          <span className="label">Email</span>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
        </div>
        <div>
          <span className="label">Password</span>
          <div className="relative">
            <input
              className="input pr-14"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "Choose a password (min 6 characters)" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-steel hover:text-pine"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>
        {err && <p className="text-sm text-alarm">{err}</p>}
        <button className="btn w-full justify-center" onClick={submit} disabled={!email || password.length < 6 || busy}>
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </div>
    </div>
  );
}
