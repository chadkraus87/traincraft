import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { programmingGate, clearanceNeed, type ScreeningRow } from "@/lib/intake/screening";
import { recordScreening, updateClientBasics } from "../../actions";

// Question text is written in-house, following the structure of the ACSM
// pre-participation screening algorithm. No published form is reproduced.
const QUESTIONS: [keyof ScreeningRow, string, string?][] = [
  ["currently_active", "Has this client done planned, structured exercise for at least 30 minutes, 3 days a week, for the past 3 months?"],
  ["known_cardiovascular_disease", "Has a doctor diagnosed them with a heart, blood vessel, or stroke-related condition?"],
  ["known_metabolic_disease", "Has a doctor diagnosed them with type 1 or type 2 diabetes?"],
  ["known_renal_disease", "Has a doctor diagnosed them with kidney disease?"],
  [
    "has_symptoms",
    "Do they currently have any of: chest pain or pressure with exertion, shortness of breath at rest or with light activity, dizziness or fainting, ankle swelling, a racing or irregular heartbeat, leg pain when walking, or unusual tiredness with everyday activity?",
  ],
  [
    "eating_disorder_history",
    "Do they have a current or past eating disorder?",
    "Used only to decide whether calorie targets and meal plans are safe to provide.",
  ],
];

export default async function IntakePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await supabaseServer();

  const [{ data: client }, { data: screenings }] = await Promise.all([
    supabase.from("clients").select("id, full_name, birth_year, height_in, sex_for_calculations").eq("id", id).single(),
    supabase.from("client_screenings").select("*").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  if (!client) notFound();

  const latest = (screenings?.[0] ?? null) as ScreeningRow | null;
  const gate = programmingGate(latest);
  const heightFt = client.height_in ? Math.floor(client.height_in / 12) : "";
  const heightIn = client.height_in ? Math.round((client.height_in % 12) * 10) / 10 : "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{client.full_name}</h1>
        <p className="text-sm text-steel mt-1">Health screening, consent, and the basics nutrition needs.</p>
      </div>

      <div className={`card border-l-4 ${gate.allowed ? "border-success" : "border-alarm"}`}>
        <h2 className="display text-lg mb-1">{gate.allowed ? "Cleared to program" : "Not cleared to program yet"}</h2>
        {gate.allowed ? (
          <p className="text-sm text-steel">
            Screened {latest?.screened_on}. Plans can be generated for this client.
          </p>
        ) : (
          <ul className="text-sm space-y-1 list-disc pl-5">
            {gate.reasons.map((r) => <li key={r}>{r}</li>)}
          </ul>
        )}
      </div>

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <form action={recordScreening} className="card space-y-4">
          <input type="hidden" name="client_id" value={client.id} />
          <h2 className="display text-lg">New health screening</h2>
          <p className="text-xs text-steel">
            Answer with the client, every question explicitly. A new screening replaces the previous
            one as current; earlier screenings stay on record.
          </p>

          {QUESTIONS.map(([key, text, hint]) => (
            <fieldset key={key} className="space-y-1">
              <legend className="text-sm">{text}</legend>
              {hint && <p className="text-xs text-steel">{hint}</p>}
              <div className="flex gap-4 text-sm">
                <label className="flex items-center gap-1.5"><input type="radio" name={key} value="yes" required /> Yes</label>
                <label className="flex items-center gap-1.5"><input type="radio" name={key} value="no" /> No</label>
              </div>
            </fieldset>
          ))}

          <div className="space-y-2 pt-3 border-t border-steel/15">
            <label className="flex gap-2 text-sm items-start">
              <input type="checkbox" name="consent_data_storage" required className="mt-1" />
              <span>The client consented to their health information being stored in this app.</span>
            </label>
            <label className="flex gap-2 text-sm items-start">
              <input type="checkbox" name="waiver_signed" className="mt-1" />
              <span>The client has signed my liability waiver and informed consent.</span>
            </label>
            <label className="block text-sm">
              <span className="label">Medical clearance obtained on (if applicable)</span>
              <input type="date" name="clearance_obtained_on" max={new Date().toISOString().slice(0, 10)} className="input" />
            </label>
          </div>

          <button type="submit" className="btn">Save screening</button>
        </form>

        <div className="space-y-6">
          <form action={updateClientBasics} className="card space-y-3">
            <input type="hidden" name="client_id" value={client.id} />
            <h2 className="display text-lg">Basics</h2>
            <p className="text-xs text-steel">Used for calorie and macro calculations.</p>
            <label className="block">
              <span className="label">Birth year</span>
              <input type="number" name="birth_year" min={1900} max={new Date().getFullYear()} defaultValue={client.birth_year ?? ""} className="input" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="label">Height (ft)</span>
                <input type="number" name="height_ft" min={3} max={8} defaultValue={heightFt} className="input" />
              </label>
              <label className="block">
                <span className="label">(in)</span>
                <input type="number" name="height_in_part" min={0} max={11.9} step={0.5} defaultValue={heightIn} className="input" />
              </label>
            </div>
            <label className="block">
              <span className="label">Sex for energy equations</span>
              <select name="sex_for_calculations" defaultValue={client.sex_for_calculations ?? ""} className="input">
                <option value="">Not set</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
            </label>
            <button type="submit" className="btn-ghost w-full justify-center">Save basics</button>
          </form>

          <div className="card">
            <h2 className="display text-lg mb-2">Screening history</h2>
            {(screenings ?? []).length === 0 ? (
              <p className="text-sm text-steel">None yet.</p>
            ) : (
              <ul className="text-sm space-y-2">
                {(screenings as ScreeningRow[]).map((s, i) => {
                  const need = clearanceNeed(s);
                  return (
                    <li key={i} className="border-b border-steel/10 pb-2 last:border-0">
                      <span className="font-medium">{s.screened_on}</span>
                      <span className="text-steel">
                        {" "}· {need === "not_needed" ? "no clearance needed" : need === "recommended" ? "clearance recommended" : "clearance required"}
                        {s.clearance_obtained_on ? ` · cleared ${s.clearance_obtained_on}` : ""}
                        {s.waiver_signed ? " · waiver signed" : " · no waiver"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
