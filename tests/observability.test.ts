/**
 * TEST 4 · Error reports must not carry client health data off-site.
 *
 * This is a privacy control, not a formatting preference. CoachRhythm holds
 * injuries and medical limitations belonging to people who are not its users
 * and never agreed to anything with us. Every field that reaches Sentry is a
 * disclosure to a subprocessor, so the redaction is asserted rather than
 * assumed — a regression here is invisible in the UI and only discoverable
 * by reading someone else's error dashboard.
 */
import { redactText, redactObject, sharedSentryOptions } from "../src/lib/observability";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS " : "FAIL "} ${name}${cond || !detail ? "" : " — " + detail}`);
  if (!cond) failures++;
}

// ── Free text ───────────────────────────────────────────────────────────
{
  const out = redactText("Failed to email maria.alvarez+gym@example.com about her plan");
  check("email addresses are stripped from free text",
    !out.includes("maria.alvarez+gym@example.com") && out.includes("[redacted-email]"), out);
}
{
  check("text with nothing sensitive is left alone",
    redactText("TypeError: cannot read property 'sets' of undefined").includes("TypeError"));
}

// ── Structured payloads ─────────────────────────────────────────────────
{
  const event = {
    message: "insert failed",
    extra: {
      full_name: "Maria Alvarez",
      email: "maria@example.com",
      tag: "lumbar_disc_injury",
      detail: "L4/L5 herniation, cleared for hinging under 40kg",
      route: "/api/generate",
      status: 500,
    },
  };
  const out = redactObject(event) as { extra: Record<string, unknown> };

  check("client name is redacted", out.extra.full_name === "[redacted]");
  check("client email is redacted", out.extra.email === "[redacted]");
  check("injury tag is redacted", out.extra.tag === "[redacted]");
  check("free-text medical detail is redacted", out.extra.detail === "[redacted]");

  // The diagnostic half has to survive, or there's no point reporting at all.
  check("non-sensitive diagnostics survive", out.extra.route === "/api/generate" && out.extra.status === 500);

  const serialized = JSON.stringify(out);
  check("no fragment of the medical detail escapes anywhere in the payload",
    !serialized.includes("herniation") && !serialized.includes("Maria"), serialized);
}
{
  // Sensitive values nested inside arrays are the easy thing to miss.
  const out = redactObject({ clients: [{ full_name: "A" }, { full_name: "B" }] }) as {
    clients: { full_name: string }[];
  };
  check("sensitive keys inside arrays are redacted",
    out.clients.every((c) => c.full_name === "[redacted]"));
}
{
  // An unbounded walk inside an error handler is its own outage.
  const deep: Record<string, unknown> = {};
  let node = deep;
  for (let i = 0; i < 30; i++) {
    node.next = {};
    node = node.next as Record<string, unknown>;
  }
  let threw = false;
  try {
    redactObject(deep);
  } catch {
    threw = true;
  }
  check("deeply nested payloads are truncated rather than throwing", !threw);
}

// ── Transport policy ────────────────────────────────────────────────────
{
  check("PII collection is off", sharedSentryOptions.sendDefaultPii === false);
  check("Sentry is inert without a DSN", sharedSentryOptions.enabled === false || !!process.env.NEXT_PUBLIC_SENTRY_DSN);

  const event = {
    request: {
      data: { tag: "hypertension_uncontrolled" },
      headers: { cookie: "sb-access-token=secret" },
      cookies: { "sb-access-token": "secret" },
      query_string: "email=maria@example.com",
    },
    user: { id: "trainer-1", email: "coach@example.com" },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sent = (sharedSentryOptions.beforeSend as any)(event, {});
  const serialized = JSON.stringify(sent);

  check("request body is dropped before send", sent.request.data === undefined);
  check("cookies and headers are dropped before send",
    sent.request.cookies === undefined && sent.request.headers === undefined);
  check("the session token never leaves", !serialized.includes("secret"));
  check("the user object is dropped", sent.user === undefined);
  check("emails in the query string are redacted", !serialized.includes("maria@example.com"));
}
{
  // console.* is where our own code is most likely to have logged a client.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dropped = (sharedSentryOptions.beforeBreadcrumb as any)({ category: "console", message: "x" }, {});
  check("console breadcrumbs are dropped entirely", dropped === null);
}

// Health reasons and client ids travel in exception messages, which are
// keyed `value` and so invisible to key-based redaction.
{
  const ev = {
    exception: { values: [{ value: "The screening reported a known cardiovascular, metabolic or kidney condition. Record medical clearance before programming." }] },
    request: { url: "https://app.example/clients/3f1a9c2e-5b7d-4a1f-9e3c-8d2b6a4f0c11/nutrition" },
    message: "shoulder_impingement is not recognised",
  } as unknown as Parameters<NonNullable<typeof sharedSentryOptions.beforeSend>>[0];
  const out = sharedSentryOptions.beforeSend!(ev, {} as never) as typeof ev;
  const exValue = out.exception!.values![0].value!;
  check("sentry: health terms are scrubbed from the exception message",
    !/cardiovascular|metabolic|kidney/i.test(exValue), exValue);
  check("sentry: a client id is scrubbed from the request url",
    !/3f1a9c2e-5b7d-4a1f-9e3c-8d2b6a4f0c11/.test(out.request!.url!), out.request!.url!);
  check("sentry: the top-level message is scrubbed", !/impingement/i.test(out.message!), out.message!);
  check("sentry: a diagnostic message still survives", /screening reported|Record medical clearance/i.test(exValue), exValue);
}

console.log(failures === 0 ? "\nALL OBSERVABILITY TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
