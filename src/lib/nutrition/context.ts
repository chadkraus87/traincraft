/**
 * Loads everything a nutrition decision needs for one client and runs the
 * gate. Shared by the page, the generation route, and the PDF route so none
 * of them can reach a different verdict. Any failed query blocks everything.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { programmingGate, type ScreeningRow } from "@/lib/intake/screening";
import { nutritionGate, type NutritionGate, type NutritionProfile, type StatePosture } from "@/lib/nutrition/gates";
import { calculateTargets, type ActivityLevel, type Goal, type MacroTargets } from "@/lib/nutrition/macros";
import { bmi } from "@/lib/progress";
import { validateMealPlan, type Food, type MealPlanJson, type MealQaReport } from "@/lib/nutrition/meals";

export interface NutritionContext {
  client: { id: string; full_name: string } | null;
  profile: NutritionProfile | null;
  weightLb: number | null;
  gate: NutritionGate;
  targets: MacroTargets | null;
}

const BLOCKED = (reason: string): NutritionGate => ({ targets: false, deficit: false, mealPlans: false, reasons: [reason] });

export async function loadNutritionContext(supabase: SupabaseClient, clientId: string): Promise<NutritionContext> {
  const [c, s, l, w, p, tp] = await Promise.all([
    supabase.from("clients").select("id, full_name, birth_year, height_in, sex_for_calculations").eq("id", clientId).maybeSingle(),
    supabase.from("client_screenings").select("*").eq("client_id", clientId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("client_limitations").select("tag").eq("client_id", clientId).eq("active", true),
    supabase.from("client_measurements").select("weight_lb").eq("client_id", clientId).not("weight_lb", "is", null)
      .order("measured_on", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("nutrition_profiles").select("*").eq("client_id", clientId).maybeSingle(),
    // RLS scopes this to the caller's own row.
    supabase.from("trainer_profiles").select("practice_state, nutrition_credential").maybeSingle(),
  ]);

  // The posture for the trainer's state. A state with no row behaves like an
  // unreviewed one: the gate blocks on anything that isn't "permitted".
  const practiceState = (tp.data?.practice_state as string | null) ?? null;
  const policy = practiceState
    ? await supabase.from("nutrition_state_policy").select("posture").eq("state", practiceState).maybeSingle()
    : { data: null, error: null };

  const client = c.data;
  const empty = { client: client ? { id: client.id, full_name: client.full_name } : null, profile: null, weightLb: null, targets: null };
  if (c.error || s.error || l.error || w.error || p.error || tp.error || policy.error) {
    return { ...empty, gate: BLOCKED("Couldn't load this client's nutrition details. Try again.") };
  }
  if (!client) return { ...empty, gate: BLOCKED("Client not found.") };

  const screening = s.data as ScreeningRow | null;
  const profile = p.data as NutritionProfile | null;
  const weightLb = w.data ? Number(w.data.weight_lb) : null;
  const sex = client.sex_for_calculations as "male" | "female" | null;
  // Birth year alone puts age in [y-1, y]. Take the lower bound so the
  // under-18 check errs toward blocking; it moves BMR by ~5 kcal.
  const age = client.birth_year ? new Date().getFullYear() - client.birth_year - 1 : null;
  const heightIn = client.height_in ? Number(client.height_in) : null;
  const hasBasics = !!(sex && age !== null && heightIn && weightLb);

  const gate = nutritionGate({
    screening,
    screeningAllowed: programmingGate(screening).allowed,
    limitationTags: (l.data ?? []).map((x) => x.tag as string),
    age,
    bmi: bmi(weightLb, heightIn),
    hasBasics,
    profile,
    practice: {
      state: practiceState,
      posture: (policy.data?.posture as StatePosture | null) ?? null,
      credential: (tp.data?.nutrition_credential as boolean | null) ?? null,
    },
  });

  const targets = gate.targets && hasBasics && profile
    ? calculateTargets({
        sex: sex!, age: age!, weightLb: weightLb!, heightIn: heightIn!,
        activity: profile.activity_level as ActivityLevel, goal: profile.goal as Goal, deficitAllowed: gate.deficit,
      })
    : null;

  return { client: { id: client.id, full_name: client.full_name }, profile, weightLb, gate, targets };
}

export interface MealPlanRow {
  id: string;
  client_id: string;
  title: string;
  days: number;
  meals_per_day: number;
  targets: MacroTargets;
  plan: MealPlanJson;
  qa_report: MealQaReport;
  status: "final" | "draft";
  created_at: string;
}

/**
 * Re-checks a stored meal plan against the client as they are now: a newly
 * logged allergy or a new diagnosis must stop a plan that was fine when it was
 * built. Used by both the page and the PDF route so the URL can't route
 * around what the UI shows.
 */
export async function liveMealPlanCheck(supabase: SupabaseClient, row: MealPlanRow) {
  const ctx = await loadNutritionContext(supabase, row.client_id);
  const { data: foods, error } = await supabase.from("foods").select("*");
  const library = (foods ?? []) as Food[];
  return { ctx, library, ...judgeMealPlan(row, ctx, library, !!error) };
}

/**
 * Pure half of the live check. Validates against the client's targets as they
 * are now, not the ones stored with the plan: a stored number can be stale
 * (weight or goal changed) or written directly through the API.
 */
export function judgeMealPlan(row: MealPlanRow, ctx: Pick<NutritionContext, "gate" | "profile" | "targets">, library: Food[], libraryError: boolean) {
  const qa = ctx.profile && ctx.targets && !libraryError
    ? validateMealPlan(row.plan, library, ctx.profile, ctx.targets, row.days, row.meals_per_day, row.qa_report.attempts)
    : null;
  const deliverable = ctx.gate.mealPlans && row.status === "final" && !!qa?.passed;
  const reasons = deliverable ? [] : [
    ...ctx.gate.reasons,
    ...(libraryError ? ["Couldn't load the food library."] : []),
    ...(row.status !== "final" ? ["This plan didn't pass QA. Generate a new one."] : []),
    ...(qa && !qa.passed ? ["This plan no longer passes QA for the client as they are now."] : []),
  ];
  return { qa, deliverable, reasons };
}
