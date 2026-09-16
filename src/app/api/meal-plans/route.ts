/**
 * POST /api/meal-plans · nutrition gate → screen food library → Claude picks
 * foods → code scales portions → QA → one retry → persist.
 * A plan that still fails QA is saved as a draft with its report, and drafts
 * can't be downloaded or sent.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { loadNutritionContext } from "@/lib/nutrition/context";
import { buildMealPlan } from "@/lib/ai/meal-builder";
import { screenFoods, scalePortions, validateMealPlan, isBetterMealAttempt, type Food } from "@/lib/nutrition/meals";
import { overGenerationLimit, RATE_LIMIT_MESSAGE } from "@/lib/rate-limit";

export const maxDuration = 120;

const Body = z.object({
  clientId: z.string().uuid(),
  days: z.number().int().min(1).max(7).default(3),
  mealsPerDay: z.number().int().min(2).max(5).default(4),
  title: z.string().trim().max(200).optional(),
});

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (await overGenerationLimit(supabase, user.id)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
  }

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json({ error: `${first.path.join(".") || "request"}: ${first.message}` }, { status: 400 });
  }
  const { clientId, days, mealsPerDay, title } = parsed.data;

  const ctx = await loadNutritionContext(supabase, clientId);
  if (!ctx.client) return NextResponse.json({ error: "Client not found" }, { status: 404 });
  if (!ctx.gate.mealPlans || !ctx.targets || !ctx.profile) {
    return NextResponse.json({ error: ctx.gate.reasons.join(" ") || "Meal plans aren't available for this client." }, { status: 409 });
  }
  const { profile, targets } = ctx;

  const { data: foods, error: foodsError } = await supabase.from("foods").select("*");
  if (foodsError) return NextResponse.json({ error: "Couldn't load the food library. Try again." }, { status: 500 });
  const library = (foods ?? []) as Food[];
  const pool = screenFoods(library, profile);
  if (pool.length < 15) {
    return NextResponse.json(
      { error: `Only ${pool.length} foods in the library fit this client's allergies and diet — too few to build a varied plan. Build meals with them directly.` },
      { status: 409 }
    );
  }

  // Counted before the Claude calls so failing requests still use quota.
  const { error: quotaError } = await supabase
    .from("generation_events")
    .insert({ trainer_id: user.id, client_id: clientId, workout_type: "meal_plan", days_per_week: days });
  if (quotaError) return NextResponse.json({ error: "Couldn't record this generation. Try again." }, { status: 500 });

  try {
    const byId = new Map(library.map((f) => [f.id, f]));
    const input = { pool, targets, diet: profile.diet, days, mealsPerDay };
    const attempt = async (attemptNo: number, feedback?: string) => {
      const plan = scalePortions(await buildMealPlan({ ...input, feedback }), byId, targets.calories);
      return { plan, qa: validateMealPlan(plan, library, profile, targets, days, mealsPerDay, attemptNo) };
    };

    let best = await attempt(1);
    if (!best.qa.passed) {
      const failures = best.qa.checks.filter((c) => !c.pass).map((c) => `${c.name}: ${c.detail}`).join(" | ");
      const retry = await attempt(2, failures);
      if (isBetterMealAttempt(retry.qa, best.qa)) best = retry;
      else best.qa.attempts = 2;
    }

    const { data: saved, error } = await supabase
      .from("meal_plans")
      .insert({
        trainer_id: user.id,
        client_id: clientId,
        title: title || `${days}-day meal plan — ${ctx.client.full_name}`,
        days,
        meals_per_day: mealsPerDay,
        targets,
        plan: best.plan,
        qa_report: best.qa,
        status: best.qa.passed ? "final" : "draft",
      })
      .select("id")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: saved.id, qa: best.qa });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Generation failed" }, { status: 500 });
  }
}
