import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LIMITATION_TAGS, LIMITATION_LABELS, EQUIPMENT_TYPES, equipmentLabel, filterForLimitations, type LimitationTag } from "@/lib/safety/rules";
import { addLimitation, toggleLimitation, addEquipment, removeEquipment, addClientNote, addGoal, toggleGoalComplete, deleteGoal } from "../actions";
import ClientEditPanel from "@/components/ClientEditPanel";
import NoteRow from "@/components/NoteRow";
import NotesAndLogsSearch from "@/components/NotesAndLogsSearch";
import SendMeasurementChartButton from "@/components/SendMeasurementChartButton";
import PlanCompareSelector from "@/components/PlanCompareSelector";
import type { PlanJson } from "@/lib/types";

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: client }, { data: limitations }, { data: equipment }, { data: plans }, { data: logs }, { data: notes }, { data: allExercises }, { data: goals }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", id).single(),
      supabase.from("client_limitations").select("*").eq("client_id", id).order("created_at"),
      supabase.from("client_equipment").select("*").eq("client_id", id).order("created_at"),
      supabase.from("workout_plans").select("id,title,status,created_at,plan").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("exercise_logs").select("id, performed_at, weight_used, reps_completed, rpe, exercises(name)")
        .eq("client_id", id).order("performed_at", { ascending: false }).limit(100),
      supabase.from("client_notes").select("*").eq("client_id", id).order("created_at", { ascending: false }),
      supabase.from("exercises").select("id, name, pattern, contraindication_tags, equipment_types"),
      supabase.from("client_goals").select("*").eq("client_id", id).order("completed").order("target_date"),
    ]);
  if (!client) notFound();

  // Retroactive safety re-check: a limitation logged AFTER a plan already
  // exists never automatically re-checks that plan. This recomputes, on
  // every page load, whether any EXISTING plan now contains an exercise
  // that conflicts with a currently-active limitation — reusing the exact
  // same filterForLimitations logic generation uses, just run backward
  // against already-saved plans instead of a fresh pool. Purely
  // informational: nothing here silently rewrites a stored plan.
  const activeLimitationTags = (limitations ?? [])
    .filter((l) => l.active)
    .map((l) => l.tag as LimitationTag);
  const exerciseLookup = new Map((allExercises ?? []).map((e) => [e.id, e]));

  const flaggedPlans = activeLimitationTags.length === 0
    ? []
    : (plans ?? [])
        .map((p) => {
          const planJson = p.plan as PlanJson;
          const seenIds = new Set<string>();
          const planExercises = planJson.sessions
            .flatMap((s) => s.blocks)
            .map((b) => b.exercise_id)
            .filter((exId) => {
              if (seenIds.has(exId)) return false;
              seenIds.add(exId);
              return true;
            })
            .map((exId) => exerciseLookup.get(exId))
            .filter((e): e is { id: string; name: string; pattern: string; contraindication_tags: string[]; equipment_types: string[] } => !!e);
          const { excluded } = filterForLimitations(planExercises, activeLimitationTags);
          return { plan: p, conflicts: excluded };
        })
        .filter((entry) => entry.conflicts.length > 0);

  // Group logs by exercise name for the training-history view. Best-effort
  // numeric extraction from weight_used (free text — "25 lb", "bodyweight",
  // etc.) gives a simple up/down/flat trend when it parses cleanly;
  // otherwise no trend indicator shows rather than guessing.
  const numericWeight = (s: string | null) => {
    const m = s?.match(/(\d+(\.\d+)?)/);
    return m ? parseFloat(m[1]) : null;
  };
  type LogRow = { id: string; performed_at: string; weight_used: string | null; reps_completed: string | null; rpe: number | null; exercises: { name: string } | null };
  const logsByExercise = new Map<string, LogRow[]>();
  for (const log of (logs ?? []) as unknown as LogRow[]) {
    const name = log.exercises?.name ?? "Unknown exercise";
    if (!logsByExercise.has(name)) logsByExercise.set(name, []);
    logsByExercise.get(name)!.push(log);
  }
  const exerciseHistory = [...logsByExercise.entries()].map(([name, entries]) => {
    const oldest = numericWeight(entries[entries.length - 1].weight_used);
    const newest = numericWeight(entries[0].weight_used);
    const trend = oldest !== null && newest !== null && entries.length > 1
      ? newest > oldest ? "up" : newest < oldest ? "down" : "flat"
      : null;
    return { name, entries, trend };
  });

  // Flattened, search-friendly versions of the same data for the combined
  // notes/logs search box.
  const searchableNotes = (notes ?? []).map((n) => ({
    date: new Date(n.created_at).toLocaleDateString(),
    text: n.note,
  }));
  const searchableLogs = ((logs ?? []) as unknown as LogRow[]).map((l) => ({
    exerciseName: l.exercises?.name ?? "Unknown exercise",
    date: new Date(l.performed_at).toLocaleDateString(),
    detail: [l.weight_used, l.reps_completed, l.rpe ? `RPE ${l.rpe}` : null].filter(Boolean).join(", ") || "logged",
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="display text-3xl">{client.full_name}</h1>
          <p className="text-sm text-steel mt-1">
            {client.goals ?? "No goals logged"}
            {client.is_remote && " · Remote"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <SendMeasurementChartButton clientId={client.id} clientName={client.full_name} clientEmail={client.email} />
          <Link href={`/plans/new?client=${client.id}`} className="btn">Build a plan</Link>
        </div>
      </div>

      <ClientEditPanel client={client} />

      {flaggedPlans.length > 0 && (
        <div className="border-l-4 border-alarm bg-alarm/10 px-4 py-3 rounded-r-md text-sm">
          <p className="font-medium text-alarm mb-1">
            {flaggedPlans.length} plan{flaggedPlans.length > 1 ? "s" : ""} may need review given this client&apos;s current limitations
          </p>
          <ul className="space-y-1">
            {flaggedPlans.map(({ plan, conflicts }) => (
              <li key={plan.id}>
                <Link href={`/plans/${plan.id}`} className="text-alarm underline">{plan.title}</Link>
                <span className="text-steel">
                  {" "}— {conflicts.map((c) => c.exercise_name).join(", ")} may conflict with {[...new Set(conflicts.map((c) => LIMITATION_LABELS[c.limitation_tag as keyof typeof LIMITATION_LABELS] ?? c.limitation_tag))].join(", ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {client.training_history && (
        <div className="card"><span className="label">Training history</span>
          <p className="text-sm whitespace-pre-wrap">{client.training_history}</p></div>
      )}

      <div className="card">
        <h2 className="display text-lg mb-3">Goals</h2>
        <form action={addGoal} className="flex flex-wrap gap-2 mb-3">
          <input type="hidden" name="client_id" value={client.id} />
          <input name="description" className="input flex-1 min-w-40" placeholder="e.g. First unassisted pull-up" />
          <input name="target_date" type="date" className="input w-auto" />
          <button className="btn-ghost shrink-0">Add goal</button>
        </form>
        {(goals ?? []).length === 0 && <p className="text-sm text-steel">No goals logged yet.</p>}
        <ul className="space-y-1.5">
          {(goals ?? []).map((g) => {
            const daysLeft = g.target_date
              ? Math.ceil((new Date(g.target_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
              : null;
            return (
              <li key={g.id} className={`flex items-center justify-between gap-2 text-sm ${g.completed ? "opacity-50" : ""}`}>
                <span className={g.completed ? "line-through" : ""}>
                  {g.description}
                  {g.target_date && (
                    <span className="text-steel">
                      {" "}— {daysLeft !== null && daysLeft < 0 ? "past target date" : daysLeft === 0 ? "target date is today" : `${daysLeft} days left`} ({new Date(g.target_date).toLocaleDateString()})
                    </span>
                  )}
                </span>
                <div className="flex gap-2 shrink-0">
                  <form action={toggleGoalComplete}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="completed" value={String(!g.completed)} />
                    <button className="text-xs text-coral underline">{g.completed ? "Reopen" : "Complete"}</button>
                  </form>
                  <form action={deleteGoal}>
                    <input type="hidden" name="id" value={g.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <button className="text-xs text-alarm underline">Delete</button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Limitations */}
        <div className="card">
          <h2 className="display text-lg mb-3">Injuries &amp; limitations</h2>
          {(limitations ?? []).length === 0 && (
            <p className="text-sm text-steel mb-3">Nothing logged. The Workout Builder treats this client as unrestricted.</p>
          )}
          <ul className="space-y-2 mb-4">
            {(limitations ?? []).map((l) => (
              <li key={l.id} className={l.active ? "flag" : "border-l-4 border-steel/30 bg-steel/5 px-3 py-2 text-sm rounded-r-md opacity-60"}>
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">{LIMITATION_LABELS[l.tag as keyof typeof LIMITATION_LABELS] ?? l.tag}</p>
                    {l.detail && <p className="text-xs text-steel">{l.detail}</p>}
                  </div>
                  <form action={toggleLimitation}>
                    <input type="hidden" name="id" value={l.id} />
                    <input type="hidden" name="client_id" value={client.id} />
                    <input type="hidden" name="active" value={String(!l.active)} />
                    <button className="text-xs underline text-steel hover:text-coral">
                      {l.active ? "Mark resolved" : "Reactivate"}
                    </button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
          <form action={addLimitation} className="space-y-2">
            <input type="hidden" name="client_id" value={client.id} />
            <select name="tag" className="input">
              {LIMITATION_TAGS.map((t) => (
                <option key={t} value={t}>{LIMITATION_LABELS[t]}</option>
              ))}
            </select>
            <input name="detail" className="input" placeholder="Context (e.g. left side, flares with overhead work)" />
            <button className="btn-ghost w-full justify-center">Log limitation</button>
          </form>
        </div>

        {/* Equipment */}
        <div className="card">
          <h2 className="display text-lg mb-3">Available equipment</h2>
          {(equipment ?? []).length === 0 && (
            <p className="text-sm text-steel mb-3">Nothing logged — plans will use bodyweight only. Add “Full gym” for in-person clients.</p>
          )}
          <ul className="space-y-1 mb-4">
            {(equipment ?? []).map((e) => (
              <li key={e.id} className="flex items-center justify-between text-sm border-b border-steel/10 py-1.5">
                <span>{e.label} ×{e.quantity}</span>
                <form action={removeEquipment}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="client_id" value={client.id} />
                  <button className="text-xs text-steel underline hover:text-alarm">Remove</button>
                </form>
              </li>
            ))}
          </ul>
          <form action={addEquipment} className="space-y-2">
            <input type="hidden" name="client_id" value={client.id} />
            <input name="label" required className="input" placeholder='Label, e.g. "25 lb kettlebell"' />
            <div className="grid grid-cols-3 gap-2">
              <select name="equipment_type" className="input col-span-1">
                {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{equipmentLabel(t)}</option>)}
              </select>
              <input name="quantity" type="number" min={1} defaultValue={1} className="input" placeholder="Qty" />
              <input name="weight_lb" type="number" step="0.5" className="input" placeholder="lb" />
            </div>
            <button className="btn-ghost w-full justify-center">Add equipment</button>
          </form>
        </div>
      </div>

      <NotesAndLogsSearch notes={searchableNotes} logs={searchableLogs} />

      <div className="card">
        <h2 className="display text-lg mb-3">Plan history</h2>
        {(plans ?? []).length === 0 && <p className="text-sm text-steel">No plans yet.</p>}
        <PlanCompareSelector plans={(plans ?? []).map((p) => ({ id: p.id, title: p.title, status: p.status }))} clientId={client.id} />
      </div>
      <div className="card">
        <h2 className="display text-lg mb-3">Training history</h2>
        {exerciseHistory.length === 0 && <p className="text-sm text-steel">No logged sets yet — log what actually happened from any plan page.</p>}
        <div className="space-y-3">
          {exerciseHistory.map(({ name, entries, trend }) => (
            <div key={name} className="border-b border-steel/10 pb-2 last:border-0">
              <p className="text-sm font-medium">
                {name}
                {trend === "up" && <span className="text-success ml-1.5">↑ trending up</span>}
                {trend === "down" && <span className="text-alarm ml-1.5">↓ trending down</span>}
                {trend === "flat" && <span className="text-steel ml-1.5">→ steady</span>}
              </p>
              <ul className="text-xs text-steel mt-1 space-y-0.5">
                {entries.slice(0, 5).map((e) => (
                  <li key={e.id}>
                    {new Date(e.performed_at).toLocaleDateString()} — {[e.weight_used, e.reps_completed, e.rpe ? `RPE ${e.rpe}` : null].filter(Boolean).join(", ") || "logged"}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <h2 className="display text-lg mb-3">Notes</h2>
        <form action={addClientNote} className="flex gap-2 mb-3">
          <input type="hidden" name="client_id" value={client.id} />
          <input name="note" className="input" placeholder="Anything worth remembering — sleep, nutrition, how they're feeling…" />
          <button className="btn-ghost shrink-0">Add note</button>
        </form>
        {(notes ?? []).length === 0 && <p className="text-sm text-steel">No notes yet.</p>}
        <ul className="space-y-2">
          {(notes ?? []).map((n) => (
            <NoteRow key={n.id} id={n.id} clientId={client.id} note={n.note} createdAt={n.created_at} />
          ))}
        </ul>
      </div>
    </div>
  );
}
