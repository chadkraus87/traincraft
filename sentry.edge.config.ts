/** Edge runtime (middleware) Sentry init. Same policy as server. */
import * as Sentry from "@sentry/nextjs";
import { sharedSentryOptions } from "@/lib/observability";

Sentry.init(sharedSentryOptions);
