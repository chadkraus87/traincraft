import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { loadNutritionContext } from "@/lib/nutrition/context";
import { ALLERGENS, ALLERGEN_LABELS, DIETS, MEDICATIONS, MEDICATION_LABELS, LIFE_STAGES, LIFE_STAGE_LABELS } from "@/lib/nutrition/gates";
import { ACTIVITY_LEVELS, GOALS } from "@/lib/nutrition/macros";
import MealPlanForm from "@/components/MealPlanForm";
import { saveNutritionProfile } from "../../actions";

export default async function NutritionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireUser();
  const supabase = await supabaseServer();
  const [ctx, { data: plans }] = await Promise.all([
    loadNutritionContext(supabase, id),
    supabase.from("meal_plans").select("id, title, status, created_at").eq("client_id", id).order("created_at", { ascending: false }),
  ]);
  if (!ctx.client) notFound();
  const { gate, targets, profile } = ctx;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{ctx.client.full_name}</h1>
        <p className="text-sm text-steel mt-1">Calorie and macro targets, and meal plans from a screened food library.</p>
      </div>

      {gate.reasons.length > 0 && (
        <div className="card border-l-4 border-alarm">
          <h2 className="display text-lg mb-1">
            {!gate.targets ? "Nutrition isn't available yet" : !gate.mealPlans ? "Targets only — no meal plans" : "Limited"}
          </h2>
          <ul className="text-sm space-y-1 list-disc pl-5">
            {[...new Set(gate.reasons)].map((r) => <li key={r}>{r}</li>)}
          </ul>
          <p className="text-xs text-steel mt-2">
            <Link href={`/clients/${id}/intake`} className="underline">Intake</Link> ·{" "}
            <Link href={`/clients/${id}/progress`} className="underline">Log a weight</Link> ·{" "}
            <Link href="/settings" className="underline">Practice state</Link>
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-6">
          {targets && (
            <div className="card">
              <h2 className="display text-lg mb-3">Daily targets</h2>
              <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  ["Calories", `${targets.calories}`, "kcal"],
                  ["Protein", `${targets.proteinG}`, "g"],
                  ["Fat", `${targets.fatG}`, "g"],
                  ["Carbs", `${targets.carbsG}`, "g"],
                ].map(([label, value, unit]) => (
                  <div key={label}>
                    <dt className="text-xs text-steel">{label}</dt>
                    <dd className="display text-2xl">{value} <span className="text-sm text-steel">{unit}</span></dd>
                  </div>
                ))}
              </dl>
              <p className="text-xs text-steel mt-3">
                Estimated maintenance {targets.maintenance} kcal (resting {targets.bmr} kcal, Mifflin-St Jeor, from {ctx.weightLb} lb).
                Estimates are commonly off by 10% or more — adjust after 2–3 weeks of weight trend.
              </p>
              {targets.notes.map((n) => <p key={n} className="text-sm text-[#F4C77A] mt-2">{n}</p>)}
            </div>
          )}

          <div className="card">
            <h2 className="display text-lg mb-2">Meal plans</h2>
            {(plans ?? []).length === 0 ? (
              <p className="text-sm text-steel">None yet.</p>
            ) : (
              <ul className="text-sm space-y-1">
                {(plans ?? []).map((p) => (
                  <li key={p.id}>
                    <Link href={`/clients/${id}/nutrition/${p.id}`} className="hover:text-coral">{p.title}</Link>
                    <span className="text-steel"> · {new Date(p.created_at).toLocaleDateString()} · </span>
                    <span className={p.status === "final" ? "text-success" : "text-[#F4C77A]"}>
                      {p.status === "final" ? "QA passed" : "Draft"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {gate.mealPlans && <MealPlanForm clientId={id} />}

          <form action={saveNutritionProfile} className="card space-y-3">
            <input type="hidden" name="client_id" value={id} />
            <h2 className="display text-lg">Nutrition profile</h2>
            <label className="block">
              <span className="label">Activity</span>
              <select name="activity_level" defaultValue={profile?.activity_level ?? "light"} className="input">
                {Object.entries(ACTIVITY_LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Goal</span>
              <select name="goal" defaultValue={profile?.goal ?? "maintain"} className="input">
                {Object.entries(GOALS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Diet</span>
              <select name="diet" defaultValue={profile?.diet ?? "none"} className="input">
                {DIETS.map((d) => <option key={d} value={d}>{d === "none" ? "No restriction" : d[0].toUpperCase() + d.slice(1)}</option>)}
              </select>
            </label>
            <fieldset>
              <legend className="label">Food allergies</legend>
              <div className="grid grid-cols-2 gap-1 text-sm">
                {ALLERGENS.map((a) => (
                  <label key={a} className="flex items-center gap-1.5">
                    <input type="checkbox" name="allergens" value={a} defaultChecked={profile?.allergens.includes(a)} /> {ALLERGEN_LABELS[a]}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="flex gap-2 text-sm items-start">
              <input type="checkbox" name="gluten_free" defaultChecked={profile?.gluten_free} className="mt-1" />
              <span>Must avoid gluten (celiac or intolerance)</span>
            </label>
            <label className="flex gap-2 text-sm items-start">
              <input type="checkbox" name="other_allergy" defaultChecked={profile?.other_allergy} className="mt-1" />
              <span>Has a food allergy not listed above</span>
            </label>
            <label className="flex gap-2 text-sm items-start">
              <input type="checkbox" name="severe_allergy" defaultChecked={profile?.severe_allergy} className="mt-1" />
              <span>Has had anaphylaxis or carries an epinephrine auto-injector</span>
            </label>

            <fieldset className="pt-3 border-t border-steel/15 space-y-3">
              <legend className="label">Medicines and life stage</legend>
              <p className="text-xs text-steel">
                Foods in the library interact with some medicines, and pregnancy and breastfeeding
                change energy needs. Until these are answered, calorie deficits and meal plans stay
                off — targets still show.
              </p>
              <label className="flex gap-2 text-sm items-start">
                <input
                  type="checkbox"
                  name="medical_screening_done"
                  defaultChecked={profile?.life_stage !== null && profile?.life_stage !== undefined}
                  className="mt-1"
                />
                <span>I asked this client the questions below.</span>
              </label>
              <label className="block">
                <span className="label">Pregnant or breastfeeding?</span>
                <select name="life_stage" defaultValue={profile?.life_stage ?? "none"} className="input">
                  {LIFE_STAGES.map((v) => <option key={v} value={v}>{LIFE_STAGE_LABELS[v]}</option>)}
                </select>
              </label>
              <div className="space-y-1 text-sm">
                <span className="label">Takes any of these</span>
                {MEDICATIONS.map((m) => (
                  <label key={m} className="flex gap-2 items-start">
                    <input type="checkbox" name="medications" value={m} defaultChecked={profile?.medications?.includes(m)} className="mt-1" />
                    <span>{MEDICATION_LABELS[m]}</span>
                  </label>
                ))}
                <label className="flex gap-2 items-start">
                  <input type="checkbox" name="other_medication" defaultChecked={profile?.other_medication ?? false} className="mt-1" />
                  <span>Takes any other prescription medicine</span>
                </label>
              </div>
            </fieldset>

            <button type="submit" className="btn-ghost w-full justify-center">Save profile</button>
          </form>
        </div>
      </div>
    </div>
  );
}
