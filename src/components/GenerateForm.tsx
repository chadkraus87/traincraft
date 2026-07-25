"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  clients: { id: string; full_name: string }[];
  workoutTypes: { key: string; label: string }[];
  defaultClient?: string;
}

export default function GenerateForm({ clients, workoutTypes, defaultClient }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState(defaultClient ?? clients[0]?.id ?? "");
  const [workoutType, setWorkoutType] = useState(workoutTypes[0]?.key ?? "");
  const [weeks, setWeeks] = useState(4);
  const [days, setDays] = useState(3);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, workoutType, weeks, daysPerWeek: days, extraInstructions: notes }),
      });
      const raw = await res.text();
      let json: { id?: string; error?: string };
      try {
        json = raw ? JSON.parse(raw) : {};
      } catch {
        throw new Error(
          `Server returned an unexpected response (status ${res.status}). This usually means the request timed out — try again, or reduce weeks/days.`
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
      <div><span className="label">Workout type</span>
        <select className="input" value={workoutType} onChange={(e) => setWorkoutType(e.target.value)}>
          {workoutTypes.map((w) => <option key={w.key} value={w.key}>{w.label}</option>)}
        </select></div>
      <div className="grid grid-cols-2 gap-3">
        <div><span className="label">Weeks</span>
          <input type="number" min={1} max={12} className="input" value={weeks} onChange={(e) => setWeeks(+e.target.value)} /></div>
        <div><span className="label">Days / week</span>
          <input type="number" min={1} max={6} className="input" value={days} onChange={(e) => setDays(+e.target.value)} /></div>
      </div>
      <div><span className="label">Trainer notes (optional)</span>
        <textarea rows={2} className="input" value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. She loves kettlebell work; keep sessions under 45 min" /></div>
      {err && <p className="text-sm text-alarm">{err}</p>}
      <button className="btn w-full justify-center" onClick={generate} disabled={busy || !clientId}>
        {busy ? "Programming… (safety filter → Claude → QA)" : "Generate plan"}
      </button>
      <p className="text-xs text-steel">Contraindicated and equipment-unavailable exercises are removed before generation. Output is QA-checked against the movement-balance and progression rules; failures save as a flagged draft.</p>
    </div>
  );
}
