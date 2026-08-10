"use client";
import { useEffect, useRef, useId } from "react";

/**
 * Cloudflare Turnstile widget for Supabase auth forms.
 *
 * Supabase enforces CAPTCHA server-side: with it enabled, every auth request
 * without a `captchaToken` is rejected. Nothing in the browser has to be
 * working for that rejection to happen — which is how enabling it at the
 * project level locked the only account out of the app entirely. The widget
 * is therefore not optional decoration; it is the other half of a setting
 * that is already switched on somewhere else.
 *
 * Renders only when NEXT_PUBLIC_TURNSTILE_SITE_KEY is set. That makes the
 * env var the single switch: no key means no widget and no token, matching a
 * project with CAPTCHA disabled. Local development and CI need no Cloudflare
 * account.
 *
 * Tokens are single-use and expire. The parent must call reset() after any
 * failed submit, or the second attempt fails with a stale token and the user
 * sees a CAPTCHA error for a wrong password.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId?: string) => void;
    };
    onTurnstileLoad?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const turnstileEnabled = !!SITE_KEY;

export default function TurnstileWidget({
  onToken,
  resetSignal = 0,
}: {
  onToken: (token: string | null) => void;
  /** Increment to force a fresh token after a failed submit. */
  resetSignal?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const instanceId = useId();

  useEffect(() => {
    if (!SITE_KEY) return;

    let cancelled = false;

    const render = () => {
      if (cancelled || !containerRef.current || !window.turnstile) return;
      if (widgetIdRef.current !== null) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: SITE_KEY,
        theme: "dark",
        callback: (token: string) => onToken(token),
        // A token that expires while the form sits open would otherwise be
        // submitted and rejected as invalid.
        "expired-callback": () => onToken(null),
        "error-callback": () => onToken(null),
      });
    };

    if (window.turnstile) {
      render();
    } else if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    } else {
      // Script is already in flight from another mount; poll briefly for the
      // global rather than racing a second injection.
      const timer = setInterval(() => {
        if (window.turnstile) {
          clearInterval(timer);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(timer);
      };
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current !== null && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // onToken is a stable callback from the parent; re-rendering the widget on
    // every keystroke would reset the challenge mid-solve.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceId]);

  useEffect(() => {
    if (resetSignal > 0 && widgetIdRef.current !== null && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      onToken(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  if (!SITE_KEY) return null;
  return <div ref={containerRef} className="my-2" />;
}
