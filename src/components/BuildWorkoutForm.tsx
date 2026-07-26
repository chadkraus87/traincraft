"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { EQUIPMENT_GROUPS } from "@/lib/safety/rules";

interface Props {
  clients: { id: string; full_name: string }[];
  workoutTypes: { key: string; label: string }[];
  defaultClient?: string;
}

/**
 * Same pipeline as GenerateForm (filter → Claude → QA), but for a single
 * one-off session instead of a multi-week plan — no weeks/days inputs,
 * since it's always exactly one workout. Posts isSingleWorkout: true,
 * which the server forces the actual shape from regardless of anything
 * else in the request.
 */
export default function BuildWorkoutForm({ clients, workoutTypes, defaultClient }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClient ?? clients[0]?.id ?? "");
  const [workoutType, setWorkoutType] = useState(workoutTypes[0]?.key ?? "");
  const [notes, setNotes] = useState("");
  const [showEquipment, setShowEquipment] = useState(false);
  const [extraEquipment, setExtraEquipment] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggleEquipment = (type: string) => {
    setExtraEquipment((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId, workoutType, isSingleWorkout: true,
          extraInstructions: notes, extraEquipmentTypes: extraEquipment,
        }),
      });
      const raw = await res.text();
      let json: { id?: string; error?: string };
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          `Server returned an unexpected response (status ${res.status}). This usually means the request timed out — try again.`
        );
      }
      if (!res.ok || !json.id) throw new Error(json.error ?? "Generation failed");
      router.push(`/plans/${json.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
      setBusy(false);
    }
  };

  return (
    <div className="card max-w-xl space-y-3">
      <div><span className="label">Client</span>
        <select className="input" value={clientId} onChange={(e) => setClientId(e.target.value)}>
          {clients.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}
        </select></div>
      <div><span className="label">Workout focus</span>
        <select className="input" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)}>
          {workoutTypes.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select></div>
      <div><span className="label">Trainer notes (optional)</span>
        <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Short on time today, keep it under 30 minutes" /></div>

      <div>
        <button
          type="button"
          className="w-full text-left text-base font-medium text-coral underline decoration-2 underline-offset-2 py-1"
          onClick={() => setShowEquipment((s) => !s)}
        >
          {showEquipment ? "▾ Hide equipment options" : "▸ Consider additional equipment"} {extraEquipment.length > 0 && `(${extraEquipment.length} selected)`}
        </button>
        {showEquipment && (
          <div className="mt-2 space-y-3 p-3 bg-steel/5 rounded-md">
            {EQUIPMENT_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-medium text-steel uppercase tracking-wide mb-1.5">{group.label}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {group.types.map((t) => {
                    const selected = extraEquipment.includes(t);
                    return (
                      <label
                        key={t}
                        className={
                          selected
                            ? "flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md border-2 border-coral bg-coral/10 cursor-pointer"
                            : "flex items-center gap-2 text-sm px-2.5 py-1.5 rounded-md border border-steel/30 bg-surface cursor-pointer hover:border-coral"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleEquipment(t)}
                          className="shrink-0"
                        />
                        {t.replace(/_/g, " ")}
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-steel mt-1">
          Optional — considered for this workout only, not saved to the client&apos;s permanent equipment list.
        </p>
      </div>

      {err && <p className="text-sm text-alarm">{err}</p>}
      <button className="btn w-full justify-center" onClick={generate} disabled={busy || !clientId}>
        {busy ? "Programming… (safety filter → Claude → QA)" : "Generate workout"}
      </button>
      <p className="text-xs text-steel">Same safety pipeline as Build a Plan — contraindicated and equipment-unavailable exercises are removed before generation, output is QA-checked, failures save as a flagged draft.</p>
    </div>
  );
}
