"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveEditedPlan } from "@/app/plans/actions";
import type { Exercise, PlanBlock, PlanJson } from "@/lib/types";

interface Props {
  planId: string;
  initialPlan: PlanJson;
  pool: Exercise[]; // safety- and equipment-filtered for this client
  isSingleWorkout?: boolean;
}

const emptyBlock = (ex: Exercise): PlanBlock => ({
  exercise_id: ex.id,
  name: ex.name,
  sets: 3,
  reps: "8-10",
  load_note: "",
  rest_sec: 60,
  coaching_note: "",
});

export default function PlanEditor({ planId, initialPlan, pool, isSingleWorkout }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState<PlanJson>(initialPlan);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const poolByPattern = pool.reduce<Record<string, Exercise[]>>((acc, e) => {
    (acc[e.pattern] ??= []).push(e);
    return acc;
  }, {});
  const poolById = new Map(pool.map((e) => [e.id, e]));

  const updateBlock = (dayIdx: number, blockIdx: number, patch: Partial<PlanBlock>) => {
    setPlan((prev) => {
      const sessions = [...prev.sessions];
      const blocks = [...sessions[dayIdx].blocks];
      blocks[blockIdx] = { ...blocks[blockIdx], ...patch };
      sessions[dayIdx] = { ...sessions[dayIdx], blocks };
      return { ...prev, sessions };
    });
  };

  const swapExercise = (dayIdx: number, blockIdx: number, exerciseId: string) => {
    const ex = poolById.get(exerciseId);
    if (!ex) return;
    updateBlock(dayIdx, blockIdx, { exercise_id: ex.id, name: ex.name });
  };

  const removeBlock = (dayIdx: number, blockIdx: number) => {
    setPlan((prev) => {
      const sessions = [...prev.sessions];
      sessions[dayIdx] = { ...sessions[dayIdx], blocks: sessions[dayIdx].blocks.filter((_, i) => i !== blockIdx) };
      return { ...prev, sessions };
    });
  };

  const addExercise = (dayIdx: number, exerciseId: string) => {
    const ex = poolById.get(exerciseId);
    if (!ex) return;
    setPlan((prev) => {
      const sessions = [...prev.sessions];
      sessions[dayIdx] = { ...sessions[dayIdx], blocks: [...sessions[dayIdx].blocks, emptyBlock(ex)] };
      return { ...prev, sessions };
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveEditedPlan(planId, plan);
      setEditing(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save changes.");
    }
    setSaving(false);
  };

  const cancel = () => {
    setPlan(initialPlan);
    setEditing(false);
    setError(null);
  };

  const PickerOptions = () => (
    <>
      <option value="">Choose an exercise…</option>
      {Object.entries(poolByPattern).map(([pattern, exs]) => (
        <optgroup key={pattern} label={pattern.replace(/_/g, " ")}>
          {exs.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </optgroup>
      ))}
    </>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!editing ? (
            <button type="button" className="btn-ghost" onClick={() => setEditing(true)}>Edit plan</button>
          ) : (
            <>
              <button type="button" className="btn" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save changes"}
              </button>
              <button type="button" className="btn-ghost" onClick={cancel} disabled={saving}>Cancel</button>
            </>
          )}
        </div>
        {editing && (
          <a href="/exercises" target="_blank" rel="noopener noreferrer" className="text-xs text-coral underline">
            Add a custom exercise (opens in a new tab)
          </a>
        )}
      </div>

      {error && <p className="text-sm text-alarm">{error}</p>}

      {plan.sessions.map((sess, dayIdx) => (
        <div key={sess.day} className="card">
          <h2 className="display text-lg mb-3">Day {sess.day} — {sess.focus}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-steel uppercase tracking-wider border-b border-coral/30">
                <th className="py-1.5 pr-2">Exercise</th>
                <th className="py-1.5 pr-2 w-16">Sets</th>
                <th className="py-1.5 pr-2 w-20">Reps</th>
                <th className="py-1.5 pr-2">Load</th>
                <th className="py-1.5 w-16">Rest</th>
                {editing && <th className="py-1.5 w-10" />}
              </tr>
            </thead>
            <tbody>
              {sess.blocks.map((b, blockIdx) => (
                <tr key={blockIdx} className="border-b border-steel/10 align-top">
                  <td className="py-2 pr-2">
                    {!editing ? (
                      <>
                        {b.name}
                        {b.coaching_note && <p className="text-xs text-steel">{b.coaching_note}</p>}
                      </>
                    ) : (
                      <div className="space-y-1">
                        <select
                          className="input py-1 text-xs"
                          value={b.exercise_id}
                          onChange={(e) => swapExercise(dayIdx, blockIdx, e.target.value)}
                        >
                          <option value={b.exercise_id}>{b.name}</option>
                          <PickerOptions />
                        </select>
                        <input
                          type="text"
                          className="input py-1 text-xs"
                          value={b.coaching_note ?? ""}
                          placeholder="Coaching note"
                          onChange={(e) => updateBlock(dayIdx, blockIdx, { coaching_note: e.target.value })}
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {!editing ? b.sets : (
                      <input type="number" min={1} className="input py-1 text-xs w-14" value={b.sets}
                        onChange={(e) => updateBlock(dayIdx, blockIdx, { sets: Number(e.target.value) })} />
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {!editing ? b.reps : (
                      <input type="text" className="input py-1 text-xs w-20" value={b.reps}
                        onChange={(e) => updateBlock(dayIdx, blockIdx, { reps: e.target.value })} />
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {!editing ? b.load_note : (
                      <input type="text" className="input py-1 text-xs" value={b.load_note}
                        onChange={(e) => updateBlock(dayIdx, blockIdx, { load_note: e.target.value })} />
                    )}
                  </td>
                  <td className="py-2">
                    {!editing ? `${b.rest_sec}s` : (
                      <input type="number" min={0} className="input py-1 text-xs w-16" value={b.rest_sec}
                        onChange={(e) => updateBlock(dayIdx, blockIdx, { rest_sec: Number(e.target.value) })} />
                    )}
                  </td>
                  {editing && (
                    <td className="py-2">
                      <button type="button" className="text-alarm text-xs underline" onClick={() => removeBlock(dayIdx, blockIdx)}>
                        Remove
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {editing && (
            <div className="mt-3">
              <select
                className="input py-1 text-xs max-w-xs"
                value=""
                onChange={(e) => { if (e.target.value) addExercise(dayIdx, e.target.value); }}
              >
                <option value="">+ Add exercise to this day…</option>
                <PickerOptions />
              </select>
            </div>
          )}
        </div>
      ))}

      <div className="card">
        <h2 className="display text-lg mb-2">{isSingleWorkout ? "Next time" : "Progression"}</h2>
        <p className="text-sm whitespace-pre-wrap">{plan.progression_notes}</p>
      </div>

      <div className="card">
        <h2 className="display text-lg mb-2">Your notes</h2>
        {!editing ? (
          <p className="text-sm whitespace-pre-wrap text-steel">
            {plan.trainer_notes || "No notes yet — click Edit plan to add some."}
          </p>
        ) : (
          <textarea
            className="input"
            rows={3}
            value={plan.trainer_notes ?? ""}
            placeholder="Anything you want to remember about this plan…"
            onChange={(e) => setPlan((prev) => ({ ...prev, trainer_notes: e.target.value }))}
          />
        )}
      </div>
    </div>
  );
}
