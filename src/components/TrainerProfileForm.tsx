"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { saveTrainerProfile } from "@/app/settings/actions";
import { US_STATES } from "@/lib/nutrition/gates";

export interface TrainerProfileValues {
  business_name: string | null;
  coach_name: string | null;
  credentials: string | null;
  phone: string | null;
  practice_state: string | null;
  nutrition_credential: boolean | null;
}

/**
 * Client-side wrapper so saving can confirm itself.
 *
 * A plain `<form action={serverAction}>` submits, revalidates, and returns a
 * visually identical page — leaving the trainer to compare the inputs against
 * what they typed to work out whether the click registered. Handling the
 * submit here lets the result be stated outright.
 */
export default function TrainerProfileForm({
  profile,
  showSkip,
}: {
  profile: TrainerProfileValues | null;
  showSkip: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setResult(null);
    startTransition(async () => {
      try {
        setResult(await saveTrainerProfile(data));
      } catch {
        // Network failures and server-action transport errors don't come back
        // as a returned value, so they'd otherwise leave the button stuck on
        // "Saving…" with no explanation.
        setResult({ ok: false, message: "Couldn't reach the server. Check your connection and try again." });
      }
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="label" htmlFor="business_name">Business name</label>
        <input
          id="business_name"
          name="business_name"
          className="input"
          defaultValue={profile?.business_name ?? ""}
          placeholder="e.g. Alvarez Strength &amp; Conditioning"
          maxLength={120}
        />
        <p className="text-xs text-steel mt-1">Appears in the header of every plan PDF.</p>
      </div>

      <div>
        <label className="label" htmlFor="coach_name">Your name</label>
        <input
          id="coach_name"
          name="coach_name"
          className="input"
          defaultValue={profile?.coach_name ?? ""}
          placeholder="e.g. Dana Alvarez"
          maxLength={120}
        />
        <p className="text-xs text-steel mt-1">
          Used for the &ldquo;Programmed by …&rdquo; line at the foot of a plan.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="credentials">Credentials</label>
        <input
          id="credentials"
          name="credentials"
          className="input"
          defaultValue={profile?.credentials ?? ""}
          placeholder="e.g. CPT | PES | CNC"
          maxLength={120}
        />
        <p className="text-xs text-steel mt-1">
          Optional. Leave blank and the line is omitted entirely rather than left empty.
        </p>
      </div>

      <div>
        <label className="label" htmlFor="phone">Phone</label>
        <input
          id="phone"
          name="phone"
          type="tel"
          className="input"
          defaultValue={profile?.phone ?? ""}
          placeholder="e.g. (512) 555-0142"
          maxLength={120}
          autoComplete="tel"
        />
        <p className="text-xs text-steel mt-1">
          Optional. Your business number, so clients can reach you about their plan.
        </p>
      </div>

      <fieldset className="pt-4 border-t border-steel/15">
        <legend className="label">Nutrition practice</legend>
        <p className="text-xs text-steel mb-3">
          Nutrition rules differ by state. Some states restrict calorie targets and meal plans to
          licensed practitioners whatever the client&apos;s health; others don&apos;t. Until this is set,
          the nutrition features stay off.
        </p>
        <label className="label" htmlFor="practice_state">State you practise in</label>
        <select
          id="practice_state"
          name="practice_state"
          className="input"
          defaultValue={profile?.practice_state ?? ""}
        >
          <option value="">Not set</option>
          {US_STATES.map((st) => <option key={st} value={st}>{st}</option>)}
        </select>

        <label className="flex gap-2 text-sm items-start mt-3">
          <input
            type="checkbox"
            name="nutrition_credential"
            defaultChecked={profile?.nutrition_credential ?? false}
            className="mt-1"
          />
          <span>
            I hold a licence, registration or certification that permits me to provide nutrition
            services in my state (for example RD, RDN, LD, LDN, CNS).
            <span className="block text-xs text-steel mt-0.5">
              Tick this only if it is true. It turns the nutrition features on regardless of the
              state rules above, because those rules restrict unlicensed practice — and the date you
              ticked it is recorded.
            </span>
          </span>
        </label>
      </fieldset>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </button>
        {showSkip && (
          <Link href="/clients/new" className="btn-ghost">Skip — add my first client</Link>
        )}
        {result && (
          <span
            role="status"
            aria-live="polite"
            className={`text-sm ${result.ok ? "text-success" : "text-alarm"}`}
          >
            {result.ok ? `✓ ${result.message}` : result.message}
          </span>
        )}
      </div>
    </form>
  );
}
