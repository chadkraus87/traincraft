"use client";
import { useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@/lib/supabase/client";
import { PRODUCT } from "@/lib/brand";

export default function SignUp() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supabase = supabaseBrowser();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }

    // Whether a session comes back depends on a project-level Supabase
    // setting ("Confirm email"), not on anything in this code — so handle
    // both. With confirmation on, signUp returns a user but no session and
    // the account isn't usable until they click the link. With it off, they
    // are already signed in and we can go straight to onboarding.
    if (data.session) {
      window.location.href = "/settings?welcome=1";
      return;
    }
    setCheckEmail(true);
    setBusy(false);
  };

  if (checkEmail) {
    return (
      <div className="card max-w-md mx-auto mt-16">
        <h1 className="display text-2xl mb-3">Confirm your email</h1>
        <p className="text-sm text-steel">
          We sent a confirmation link to <span className="text-ink">{email}</span>. Click it to
          activate your {PRODUCT.name} account, then sign in.
        </p>
        <p className="text-xs text-steel mt-4">
          Nothing arrived after a minute? Check spam, or{" "}
          <button className="underline hover:text-coral" onClick={() => setCheckEmail(false)}>
            try a different address
          </button>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="card max-w-md mx-auto mt-16">
      <h1 className="display text-2xl mb-1">Create your account</h1>
      <p className="text-sm text-steel mb-4">{PRODUCT.tagline}</p>
      <form onSubmit={submit} className="space-y-3">
        <div>
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <span className="label">Password</span>
          <div className="relative">
            <input
              className="input pr-14"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              minLength={8}
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
          <p className="text-xs text-steel mt-1">
            You&apos;ll be storing client health information — use a password you don&apos;t reuse.
          </p>
        </div>
        {err && <p className="text-sm text-alarm">{err}</p>}
        <button
          type="submit"
          className="btn w-full justify-center"
          disabled={!email || password.length < 8 || busy}
        >
          {busy ? "Creating account…" : "Create account"}
        </button>
      </form>
      <p className="text-sm text-steel mt-4">
        Already have an account?{" "}
        <Link href="/login" className="underline hover:text-coral">Sign in</Link>
      </p>
    </div>
  );
}
