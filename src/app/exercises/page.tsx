import { supabaseServer } from "@/lib/supabase/server";
import { EXERCISE_CATEGORIES } from "@/lib/safety/rules";
import { addCustomExercise } from "./actions";
import MuscleDiagram from "@/components/MuscleDiagram";
import type { Exercise } from "@/lib/types";

const PATTERNS = [
  "squat","hinge","lunge","push_horizontal","push_vertical","pull_horizontal",
  "pull_vertical","core_antiextension","core_antirotation","core_flexion",
  "carry","conditioning","mobility",
];

function ExerciseRow({ e }: { e: Exercise }) {
  return (
    <li className="card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="font-medium">
            {e.name}{" "}
            {e.trainer_id && <span className="text-xs px-1.5 py-0.5 rounded bg-terracotta/20 text-coral align-middle">Custom</span>}
          </p>
          <p className="text-xs text-steel mt-0.5">{e.description}</p>
          <p className="text-xs text-steel mt-1">
            {e.pattern.replace("_", " ")} · {e.muscle_groups.join(", ")} · {e.equipment_types.join(", ")} · {e.difficulty}
          </p>
          {e.cues && <p className="text-xs mt-1 whitespace-pre-wrap text-ink/80">{e.cues}</p>}
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          {e.contraindication_tags.length > 0 && (
            <span className="text-[10px] uppercase tracking-wide text-alarm" title={e.contraindication_tags.join(", ")}>
              ⚑ {e.contraindication_tags.length} safety tag{e.contraindication_tags.length > 1 ? "s" : ""}
            </span>
          )}
          <MuscleDiagram muscleGroups={e.muscle_groups} />
        </div>
      </div>
    </li>
  );
}

export default async function ExercisesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pattern?: string; category?: string }>;
}) {
  const { q, pattern, category } = await searchParams;
  const supabase = await supabaseServer();
  let query = supabase.from("exercises").select("*").eq("is_active", true).order("name");
  if (q) query = query.ilike("name", `%${q}%`);
  if (pattern) query = query.eq("pattern", pattern);
  if (category) query = query.eq("category", category);
  const { data } = await query;
  const exercises = (data ?? []) as Exercise[];

  const byCategory = EXERCISE_CATEGORIES.map((cat) => ({
    category: cat,
    items: exercises.filter((e) => e.category === cat),
  })).filter((g) => g.items.length > 0);

  const uncategorized = exercises.filter((e) => !EXERCISE_CATEGORIES.includes(e.category as typeof EXERCISE_CATEGORIES[number]));

  return (
    <div className="grid md:grid-cols-[1fr_340px] gap-6">
      <div>
        <h1 className="display text-3xl mb-4">Exercise library</h1>
        <form className="flex gap-2 mb-4 flex-wrap">
          <input name="q" defaultValue={q} className="input" placeholder="Search exercises…" />
          <select name="category" defaultValue={category ?? ""} className="input max-w-56">
            <option value="">All categories</option>
            {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="pattern" defaultValue={pattern ?? ""} className="input max-w-48">
            <option value="">All patterns</option>
            {PATTERNS.map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
          </select>
          <button className="btn">Filter</button>
        </form>

        {exercises.length === 0 && <p className="text-sm text-steel">No exercises match those filters.</p>}

        <div className="space-y-4">
          {byCategory.map((g) => (
            <details key={g.category} className="group">
              <summary className="display text-lg font-bold text-coral cursor-pointer mb-2 select-none">
                {g.category}{" "}
                <span className="text-steel text-sm normal-case font-body font-normal">({g.items.length})</span>
              </summary>
              <ul className="space-y-2 mb-2">
                {g.items.map((e) => <ExerciseRow key={e.id} e={e} />)}
              </ul>
            </details>
          ))}
          {uncategorized.length > 0 && (
            <details className="group">
              <summary className="display text-lg font-bold text-coral cursor-pointer mb-2 select-none">
                Uncategorized{" "}
                <span className="text-steel text-sm normal-case font-body font-normal">({uncategorized.length})</span>
              </summary>
              <ul className="space-y-2 mb-2">
                {uncategorized.map((e) => <ExerciseRow key={e.id} e={e} />)}
              </ul>
            </details>
          )}
        </div>
      </div>

      <aside className="card h-fit">
        <h2 className="display text-lg mb-1">Add custom exercise</h2>
        <p className="text-xs text-steel mb-3">Usable by the Workout Builder exactly like the base library. Add safety tags so the contraindication engine can protect injured clients from it too.</p>
        <form action={addCustomExercise} className="space-y-2">
          <input name="name" required className="input" placeholder="Name" />
          <textarea name="description" required rows={2} className="input" placeholder="Description" />
          <select name="category" className="input">
            {EXERCISE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select name="pattern" className="input">
            {PATTERNS.map((p) => <option key={p} value={p}>{p.replace("_", " ")}</option>)}
          </select>
          <input name="muscle_groups" className="input" placeholder="Muscles (comma-sep): glutes, hamstrings" />
          <input name="equipment_types" className="input" placeholder="Equipment: kettlebell, band (or bodyweight)" />
          <select name="difficulty" className="input">
            <option>beginner</option><option>intermediate</option><option>advanced</option>
          </select>
          <textarea name="cues" rows={2} className="input" placeholder="Coaching cues (one per line)" />
          <input name="contraindication_tags" className="input" placeholder="Safety tags: overhead, high_impact…" />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="unilateral" /> Unilateral (per side)</label>
          <button className="btn w-full justify-center">Add to library</button>
        </form>
      </aside>
    </div>
  );
}
