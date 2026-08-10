/**
 * Server-side Sentry init. Policy lives in src/lib/observability.ts so the
 * server, edge and browser runtimes can't drift apart on what gets scrubbed.
 */
import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/observability";

Sentry.init(sharedSentryOptions);
