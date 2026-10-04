import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import BookSessionForm from "@/components/BookSessionForm";
import { setSessionStatus } from "./actions";

type SessionRow = {
  id: string;
  client_id: string;
  starts_at: string;
  duration_minutes: number;
  status: string;
  clients: { full_name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export default async function SchedulePage() {
  const user = await requireUser();
  const supabase = await supabaseServer();

  const since = new Date(Date.now() - 14 * 86_400_000).toISOString();
  const [{ data: sessions }, { data: clients }, { data: profile }] = await Promise.all([
    supabase
      .from("training_sessions")
      .select("id, client_id, starts_at, duration_minutes, status, clients(full_name)")
      .gte("starts_at", since)
      .order("starts_at"),
    supabase.from("clients").select("id, full_name").order("full_name"),
    supabase.from("trainer_profiles").select("timezone").eq("trainer_id", user.id).maybeSingle(),
  ]);

  // Render in the trainer's zone. Until they book once, fall back to UTC and
  // say so, rather than silently showing times that look wrong.
  const timeZone = profile?.timezone ?? "UTC";
  const day = new Intl.DateTimeFormat("en-US", { timeZone, weekday: "long", month: "short", day: "numeric" });
  const time = new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", minute: "2-digit" });

  const now = Date.now();
  const rows = (sessions ?? []) as unknown as SessionRow[];
  // Past sessions still marked "scheduled" need an outcome — that is what
  // makes package balances and attendance history honest.
  const needsOutcome = rows.filter((s) => s.status === "scheduled" && new Date(s.starts_at).getTime() < now);
  const upcoming = rows.filter((s) => new Date(s.starts_at).getTime() >= now);

  const byDay = new Map<string, SessionRow[]>();
  for (const s of upcoming) {
    const key = day.format(new Date(s.starts_at));
    byDay.set(key, [...(byDay.get(key) ?? []), s]);
  }

  const statusButtons = (s: SessionRow, options: string[]) => (
    <div className="flex gap-2">
      {options.map((st) => (
        <form key={st} action={setSessionStatus}>
          <input type="hidden" name="id" value={s.id} />
          <input type="hidden" name="status" value={st} />
          <button className="text-xs underline text-steel hover:text-coral">{STATUS_LABEL[st]}</button>
        </form>
      ))}
    </div>
  );

  return (
    <div className="grid md:grid-cols-[1fr_300px] gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="display text-3xl">Schedule</h1>
          <p className="text-sm text-steel mt-1">
            Times shown in {timeZone === "UTC" && !profile?.timezone ? "UTC until you book your first session" : timeZone}.
          </p>
        </div>

        {needsOutcome.length > 0 && (
          <div className="card border-l-4 border-signal">
            <h2 className="display text-lg mb-2">Record what happened</h2>
            <ul className="space-y-2 text-sm">
              {needsOutcome.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 flex-wrap">
                  <span>
                    <Link href={`/clients/${s.client_id}`} className="underline">{s.clients?.full_name}</Link>
                    <span className="text-steel"> · {day.format(new Date(s.starts_at))}, {time.format(new Date(s.starts_at))}</span>
                  </span>
                  {statusButtons(s, ["completed", "no_show", "cancelled"])}
                </li>
              ))}
            </ul>
          </div>
        )}

        {byDay.size === 0 ? (
          <div className="card"><p className="text-sm text-steel">No upcoming sessions.</p></div>
        ) : (
          [...byDay.entries()].map(([label, items]) => (
            <div key={label} className="card">
              <h2 className="display text-lg mb-2">{label}</h2>
              <ul className="space-y-2 text-sm">
                {items.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-3 flex-wrap">
                    <span>
                      <span className="font-medium">{time.format(new Date(s.starts_at))}</span>
                      <span className="text-steel"> · {s.duration_minutes} min · </span>
                      <Link href={`/clients/${s.client_id}`} className="underline">{s.clients?.full_name}</Link>
                      {s.status !== "scheduled" && <span className="text-steel"> · {STATUS_LABEL[s.status]}</span>}
                    </span>
                    {s.status === "scheduled" && statusButtons(s, ["cancelled"])}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>

      <div className="card h-fit">
        <h2 className="display text-lg mb-3">Book a session</h2>
        <BookSessionForm clients={clients ?? []} />
      </div>
    </div>
  );
}
