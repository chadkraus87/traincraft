"use client";
import { useState, useTransition } from "react";
import { bookSession } from "@/app/schedule/actions";

/**
 * Client component because the conversion from wall-clock time to an instant
 * has to happen where the trainer's time zone is known. `datetime-local`
 * yields "2026-09-17T06:00" with no offset; the browser interprets that in
 * its own zone, which is exactly what the trainer meant.
 */
export default function BookSessionForm({
  clients,
  defaultClientId,
}: {
  clients: { id: string; full_name: string }[];
  defaultClientId?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const local = String(f.get("starts_at_local") || "");
    const form = e.currentTarget;
    setMsg(null);
    start(async () => {
      try {
        await bookSession({
          clientId: String(f.get("client_id")),
          startsAtIso: new Date(local).toISOString(),
          durationMinutes: Number(f.get("duration_minutes")),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
        form.reset();
        setMsg({ ok: true, text: "Session booked." });
      } catch (err) {
        setMsg({ ok: false, text: err instanceof Error ? err.message : "Couldn't book the session." });
      }
    });
  };

  if (clients.length === 0) return <p className="text-sm text-steel">Add a client first.</p>;

  return (
    <form onSubmit={submit} className="space-y-3">
      <label className="block">
        <span className="label">Client</span>
        <select name="client_id" defaultValue={defaultClientId ?? clients[0].id} className="input">
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select>
      </label>
      <label className="block">
        <span className="label">Date &amp; time</span>
        <input type="datetime-local" name="starts_at_local" required className="input" />
      </label>
      <label className="block">
        <span className="label">Duration (minutes)</span>
        <input type="number" name="duration_minutes" min={5} max={480} step={5} defaultValue={60} className="input" />
      </label>
      <button type="submit" className="btn w-full justify-center" disabled={pending}>
        {pending ? "Booking…" : "Book session"}
      </button>
      {msg && (
        <p role="status" className={`text-sm ${msg.ok ? "text-success" : "text-alarm"}`}>{msg.text}</p>
      )}
    </form>
  );
}
