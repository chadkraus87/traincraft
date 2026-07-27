"use client";
import { useState } from "react";
import { logExercisePerformance } from "@/app/plans/actions";

/**
 * Optional, lightweight "what actually happened" logger sitting under each
 * exercise in view mode. Never blocks anything — logging is opt-in, and a
 * client with zero logs behaves exactly as before. Logged data feeds back
 * into future generations via recentPerformance in the builder prompt.
 */
export default function ExerciseLogRow({
  clientId,
  exerciseId,
  planId,
}: {
  clientId: string;
  exerciseId: string;
  planId: string;
}) {
  const [open, setOpen] = useState(false);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [rpe, setRpe] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setSaving(true);
    await logExercisePerformance({
      clientId, exerciseId, planId,
      weightUsed: weight, repsCompleted: reps, rpe, notes,
    });
    setSaving(false);
    setSaved(true);
    setOpen(false);
  };

  if (saved) {
    return <p className="text-xs text-success mt-1">Logged ✓ {weight && `${weight}`}{reps && ` · ${reps}`}{rpe && ` · RPE ${rpe}`}</p>;
  }

  if (!open) {
    return (
      <button type="button" className="text-xs text-coral underline mt-1" onClick={() => setOpen(true)}>
        + Log what happened
      </button>
    );
  }

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5">
      <input className="input py-1 text-xs w-20" placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} />
      <input className="input py-1 text-xs w-20" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} />
      <input className="input py-1 text-xs w-16" placeholder="RPE" value={rpe} onChange={(e) => setRpe(e.target.value)} />
      <input className="input py-1 text-xs flex-1 min-w-24" placeholder="Note (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <button type="button" className="text-xs text-coral underline shrink-0" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="text-xs text-steel underline shrink-0" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
