/**
 * Next.js instrumentation hook — initialises Sentry per runtime.
 *
 * Each runtime gets its own init because the Node server, the edge runtime
 * (which is where middleware runs) and the browser are separate JavaScript
 * environments. All three load the same options from
 * src/lib/observability.ts, so the redaction policy can't drift between them.
 */
import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

// Captures errors thrown in Server Components, server actions and middleware,
// which otherwise never reach a client-side handler.
export const onRequestError = Sentry.captureRequestError;
