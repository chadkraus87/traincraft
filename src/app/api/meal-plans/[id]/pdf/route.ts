import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { getTrainerBrand } from "@/lib/brand-server";
import { liveMealPlanCheck, type MealPlanRow } from "@/lib/nutrition/context";
import { dayTotals } from "@/lib/nutrition/meals";
import { ALLERGEN_LABELS, type Allergen } from "@/lib/nutrition/gates";
import { mealPlanToPdf } from "@/lib/pdf";
import { hasAcceptedCurrentTerms, TERMS_REQUIRED } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Terms gate, same as the pages. A route that processes client health data
  // must not run for a trainer who hasn't accepted the current versions.
  if (!(await hasAcceptedCurrentTerms(supabase, user.id))) {
    return NextResponse.json({ error: TERMS_REQUIRED, termsRequired: true }, { status: 403 });
  }

  const { data } = await supabase.from("meal_plans").select("*").eq("id", id).maybeSingle();
  if (!data) return NextResponse.json({ error: "Meal plan not found" }, { status: 404 });
  const row = data as MealPlanRow;

  // Same live check as the page: status, QA against the current profile, and the gate.
  const { ctx, library, qa, deliverable, reasons } = await liveMealPlanCheck(supabase, row);
  if (!deliverable || !ctx.client || !ctx.profile) {
    return NextResponse.json({ error: reasons.join(" ") }, { status: 409 });
  }

  const byId = new Map(library.map((f) => [f.id, f]));
  const days = row.plan.days.map((d) => ({
    day: d.day,
    totals: dayTotals(d, byId),
    meals: d.meals.map((m) => ({
      name: m.name,
      items: m.items.map((it) => {
        const f = byId.get(it.food_id)!; // deliverable ⇒ every food passed pool_membership
        return { name: f.name, amount: `${it.grams} g` };
      }),
    })),
  }));
  const screenedFor = [
    ...ctx.profile.allergens.map((a) => ALLERGEN_LABELS[a as Allergen] ?? a),
    ...(ctx.profile.gluten_free ? ["gluten"] : []),
  ];

  const brand = await getTrainerBrand(user.id);
  const buf = await mealPlanToPdf(ctx.client.full_name, row.title, days, screenedFor, qa?.advisories ?? [], brand);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${row.title.replace(/[^a-z0-9 -]/gi, "")}.pdf"`,
    },
  });
}
