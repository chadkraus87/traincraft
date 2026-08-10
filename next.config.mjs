/**
 * Security headers.
 *
 * The session lives in a cookie that @supabase/ssr reads from JavaScript, so
 * any successful XSS is full account takeover — and this app holds clients'
 * injury and medical-limitation data. The CSP is the backstop for that.
 *
 * 'unsafe-inline' on script-src is regrettable but load-bearing: Next.js
 * inlines its hydration bootstrap, and moving to a nonce means routing every
 * request through middleware that can mint one and threading it into the
 * document. Worth doing — tracked as follow-up work — but a CSP with
 * frame-ancestors, object-src, and base-uri locked down is strictly better
 * than the nothing that was here before, so it ships now rather than waiting.
 *
 * style-src and font-src allow Google Fonts because layout.tsx loads Barlow
 * Condensed from there. Self-hosting the font would let both drop to 'self'.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data: blob:",
  // Supabase is reached directly from the browser for auth and queries.
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};
/**
 * Source maps are only uploaded when a Sentry auth token is present.
 *
 * Without this guard a contributor — or CI — building without Sentry
 * credentials gets a failed build for a monitoring feature they aren't
 * using. Errors still report fine without uploaded maps; the stack traces
 * are just minified.
 */
const sentryEnabled = !!process.env.SENTRY_AUTH_TOKEN;

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  // Sentry's build plugin phones home with anonymous usage stats by default.
  telemetry: false,
  sourcemaps: {
    disable: !sentryEnabled,
    // Uploaded maps are deleted from the deployed output afterwards, so the
    // app's source isn't served publicly alongside it.
    deleteSourcemapsAfterUpload: true,
  },
  // Routes browser error reports through our own domain, so an ad blocker
  // doesn't silently swallow the errors we most need to see.
  tunnelRoute: "/monitoring",
  disableLogger: true,
});
