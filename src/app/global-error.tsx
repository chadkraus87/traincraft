"use client";

/**
 * Last-resort boundary for errors thrown while rendering the root layout.
 *
 * Next.js replaces the entire document when this renders, which is why it
 * ships its own <html> and <body>. Without it, a render error in the shell
 * shows the framework's default screen and never reaches Sentry.
 *
 * Deliberately says nothing about what went wrong. The error may have been
 * thrown while handling a client's injury data, and this page is the one
 * place with no control over who is looking at the screen.
 */
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <main style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1.5rem", maxWidth: "32rem", margin: "0 auto" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>Something went wrong</h1>
          <p style={{ color: "#5C6660", marginBottom: "1.5rem" }}>
            This has been reported automatically. Nothing you entered was lost — try again, and if
            it keeps happening let us know.
          </p>
          <button
            onClick={reset}
            style={{ padding: "0.6rem 1.1rem", borderRadius: "0.4rem", border: "1px solid #1E4D3B", background: "#1E4D3B", color: "#fff", cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
