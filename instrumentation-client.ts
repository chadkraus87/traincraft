/**
 * Browser Sentry init.
 *
 * Session Replay is deliberately not enabled. It would record the trainer's
 * screen — client names, injuries, medical notes — and ship it to a third
 * party. That is a health-data disclosure that buys nothing a stack trace
 * doesn't already give us.
 */
import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/observability";

Sentry.init(sharedSentryOptions);

// Lets Sentry tie a client-side error to the navigation that caused it.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
