/**
 * Error-reporting policy, in one place.
 *
 * CoachRhythm stores injuries and medical limitations belonging to people
 * who are not its users — a trainer's clients, who have no account here and
 * no relationship with us. Anything we ship to a third-party error tracker
 * is a disclosure of that data, and the tracker becomes a subprocessor we
 * have to name and justify.
 *
 * So the default posture is inverted from the usual one: send enough to
 * diagnose a crash, and nothing that identifies a human. A stack trace and
 * a route are diagnostic. A request body containing "lumbar_disc_injury" and
 * a client's name is a health-data disclosure that buys us nothing a stack
 * trace didn't already tell us.
 *
 * Practically that means: no request bodies, no headers, no cookies, no IPs,
 * no user identifiers, and a scrub of anything in an error message that
 * looks like an email address. Sampling is left at 100% for errors because
 * the volume is low and a missed error is the thing we're trying to fix.
 */

import type {
  BrowserOptions,
  Breadcrumb,
  ErrorEvent as SentryErrorEvent,
  NodeOptions,
} from "@sentry/nextjs";

/** Keys whose values must never leave the server, wherever they appear. */
const SENSITIVE_KEY = /email|phone|full_name|name|goals|training_history|note|detail|tag|plan|password|token|key|authorization|cookie/i;

const EMAIL_IN_TEXT = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/** Replace anything that reads like an email address in free text. */
export function redactText(input: string): string {
  return input.replace(EMAIL_IN_TEXT, "[redacted-email]");
}

/**
 * Recursively strip values under sensitive keys.
 *
 * Depth-limited because Sentry events can contain deeply nested or cyclic
 * structures, and an unbounded walk in an error handler is its own outage.
 */
export function redactObject(value: unknown, depth = 0): unknown {
  if (depth > 6) return "[redacted-depth]";
  if (typeof value === "string") return redactText(value);
  if (Array.isArray(value)) return value.map((v) => redactObject(v, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? "[redacted]" : redactObject(v, depth + 1);
    }
    return out;
  }
  return value;
}

/**
 * Shared Sentry options. Applied identically on server, edge and client so
 * there is one policy rather than three that drift.
 *
 * `sendDefaultPii: false` is the important one — with it true, Sentry
 * attaches IP addresses and request headers automatically.
 */
export const sharedSentryOptions: NodeOptions & BrowserOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  // No DSN configured means Sentry initialises to a no-op. Deliberate: the
  // app must run identically for a contributor who has no Sentry account.
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
  tracesSampleRate: 0,
  sendDefaultPii: false,
  maxBreadcrumbs: 20,

  beforeSend(event: SentryErrorEvent): SentryErrorEvent {
    // Belt and braces: even with sendDefaultPii off, drop the request body
    // and headers outright rather than trusting the SDK's own redaction.
    if (event.request) {
      delete event.request.data;
      delete event.request.cookies;
      delete event.request.headers;
      if (typeof event.request.query_string === "string") {
        event.request.query_string = redactText(event.request.query_string);
      }
    }
    delete event.user;
    return redactObject(event) as SentryErrorEvent;
  },

  beforeBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
    // Console breadcrumbs are the most likely place for a client's details
    // to leak in, via a console.error we wrote ourselves.
    if (breadcrumb.category === "console") return null;
    return redactObject(breadcrumb) as Breadcrumb;
  },
};
