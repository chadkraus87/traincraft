"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import TurnstileWidget, { turnstileEnabled } from "@/components/TurnstileWidget";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaReset, setCaptchaReset] = useState(0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      // Only sent when a site key is configured. Supabase rejects auth
      // requests without a token whenever project-level CAPTCHA is on, so
      // these two settings have to be turned on together.
      ...(captchaToken ? { options: { captchaToken } } : {}),
    });
    if (error) {
      setErr(error.message);
      // Turnstile tokens are single-use. Without this reset the next attempt
      // fails on a stale token, and a simple typo'd password starts
      // reporting itself as a CAPTCHA failure.
      setCaptchaReset((n) => n + 1);
      setBusy(false);
      return;
    }

    // Return the trainer to whatever they were trying to reach. Only
    // same-origin absolute paths are honoured — a "next" of "//evil.test" or
    // "https://evil.test" is discarded rather than followed, so the redirect
    // can't be turned into a phishing hop.
    const next = new URLSearchParams(window.location.search).get("next");
    const safe = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
    window.location.href = safe;
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
        <TurnstileWidget onToken={setCaptchaToken} resetSignal={captchaReset} />
        {err && <p className="text-sm text-alarm">{err}</p>}
        <button
          type="submit"
          className="btn w-full justify-center"
          disabled={!email || password.length < 6 || busy || (turnstileEnabled && !captchaToken)}
        >
          {busy ? "Please wait…" : "Sign in"}
        </button>
      </form>
      <p className="text-sm text-steel mt-4">
        New here?{" "}
        <Link href="/signup" className="underline hover:text-coral">Create an account</Link>
      </p>
    </div>
  );
}
