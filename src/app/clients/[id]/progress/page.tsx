import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { MEASUREMENT_FIELDS, CHECKIN_FIELDS, bmi } from "@/lib/progress";
import Sparkline from "@/components/Sparkline";
import { addMeasurement, deleteMeasurement, addCheckin } from "../../actions";

type Row = Record<string, number | string | null>;

export default async function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await supabaseServer();

  const [{ data: client }, { data: measurements }, { data: checkins }] = await Promise.all([
    supabase.from("clients").select("id, full_name, height_in").eq("id", id).single(),
    supabase.from("client_measurements").select("*").eq("client_id", id).order("measured_on"),
    supabase.from("client_checkins").select("*").eq("client_id", id).order("checked_in_on"),
  ]);
  if (!client) notFound();

  const rows = (measurements ?? []) as Row[];
  const series = (key: string) =>
    rows.map((r) => r[key]).filter((v): v is number | string => v !== null).map(Number);

  // Only chart fields that have been measured at least twice.
  const trends = MEASUREMENT_FIELDS.map((f) => ({ ...f, values: series(f.key) })).filter((f) => f.values.length >= 2);
  const latest = rows[rows.length - 1];
  const latestBmi = latest ? bmi(latest.weight_lb as number | null, client.height_in) : null;
  const today = new Date().toISOString().slice(0, 10);
  const groups = [...new Set(MEASUREMENT_FIELDS.map((f) => f.group))];
  const checkinRows = (checkins ?? []) as Row[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{client.full_name}</h1>
        <p className="text-sm text-steel mt-1">
          {rows.length} measurement{rows.length === 1 ? "" : "s"} · {checkinRows.length} check-in{checkinRows.length === 1 ? "" : "s"}
          {latestBmi ? ` · BMI ${latestBmi} (latest)` : ""}
        </p>
      </div>

      {trends.length > 0 && (
        <div className="card">
          <h2 className="display text-lg mb-3">Trends</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trends.map((t) => {
              const first = t.values[0];
              const last = t.values[t.values.length - 1];
              const delta = Math.round((last - first) * 10) / 10;
              return (
                <div key={t.key} className="text-coral">
                  <p className="text-sm text-ink">
                    {t.label} <span className="text-steel">{last} {t.unit} ({delta > 0 ? "+" : ""}{delta})</span>
                  </p>
                  <Sparkline values={t.values} label={t.label} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <form action={addMeasurement} className="card space-y-4">
          <input type="hidden" name="client_id" value={client.id} />
          <h2 className="display text-lg">Log measurements</h2>
          <label className="block">
            <span className="label">Date</span>
            <input type="date" name="measured_on" defaultValue={today} max={today} className="input" />
          </label>
          {groups.map((g) => (
            <fieldset key={g}>
              <legend className="label">{g}</legend>
              <div className="grid grid-cols-2 gap-2">
                {MEASUREMENT_FIELDS.filter((f) => f.group === g).map((f) => (
                  <label key={f.key} className="block text-xs">
                    <span className="text-steel">{f.label} ({f.unit})</span>
                    <input type="number" name={f.key} min={f.min} max={f.max} step="0.1" inputMode="decimal" className="input" />
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
          <button type="submit" className="btn">Save measurements</button>
        </form>

        <div className="space-y-6">
          <form action={addCheckin} className="card space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <h2 className="display text-lg">Check-in</h2>
            <label className="block">
              <span className="label">Date</span>
              <input type="date" name="checked_in_on" defaultValue={today} max={today} className="input" />
            </label>
            {CHECKIN_FIELDS.map((f) => (
              <label key={f.key} className="block text-sm">
                <span className="label">{f.label} (1 = {f.low}, 5 = {f.high})</span>
                <select name={f.key} required defaultValue="" className="input">
                  <option value="" disabled>Choose…</option>
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </label>
            ))}
            <button type="submit" className="btn-ghost w-full justify-center">Save check-in</button>
          </form>

          {checkinRows.length > 0 && (
            <div className="card">
              <h2 className="display text-lg mb-2">Recent check-ins</h2>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-steel">
                    <th className="py-1 font-normal">Date</th>
                    {CHECKIN_FIELDS.map((f) => <th key={f.key} className="py-1 font-normal">{f.label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {checkinRows.slice(-8).reverse().map((c) => (
                    <tr key={String(c.id)} className="border-t border-steel/10">
                      <td className="py-1">{c.checked_in_on}</td>
                      {CHECKIN_FIELDS.map((f) => <td key={f.key} className="py-1">{c[f.key]}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="card overflow-x-auto">
          <h2 className="display text-lg mb-2">Measurement history</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-steel">
                <th className="py-1 pr-3 font-normal">Date</th>
                {MEASUREMENT_FIELDS.map((f) => <th key={f.key} className="py-1 pr-3 font-normal whitespace-nowrap">{f.label}</th>)}
                <th />
              </tr>
            </thead>
            <tbody>
              {[...rows].reverse().map((r) => (
                <tr key={String(r.id)} className="border-t border-steel/10">
                  <td className="py-1 pr-3 whitespace-nowrap">{r.measured_on}</td>
                  {MEASUREMENT_FIELDS.map((f) => <td key={f.key} className="py-1 pr-3">{r[f.key] ?? "—"}</td>)}
                  <td className="py-1">
                    <form action={deleteMeasurement}>
                      <input type="hidden" name="client_id" value={client.id} />
                      <input type="hidden" name="id" value={String(r.id)} />
                      <button className="text-xs underline text-steel hover:text-alarm" aria-label={`Delete measurement from ${r.measured_on}`}>Delete</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
