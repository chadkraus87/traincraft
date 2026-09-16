import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { liveMealPlanCheck, type MealPlanRow } from "@/lib/nutrition/context";
import { dayTotals, MEAL_QA_LABELS } from "@/lib/nutrition/meals";
import { deleteMealPlan } from "../../../actions";

export default async function MealPlanView({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("meal_plans").select("*").eq("id", planId).eq("client_id", id).maybeSingle();
  if (!data) notFound();
  const row = data as MealPlanRow;
  const { ctx, qa, library, deliverable, reasons } = await liveMealPlanCheck(supabase, row);
  const byId = new Map(library.map((f) => [f.id, f]));
  const checks = qa?.checks ?? row.qa_report.checks;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-3xl">{row.title}</h1>
          <p className="text-sm text-steel mt-1">
            Built for {row.targets.calories} kcal{ctx.targets && ctx.targets.calories !== row.targets.calories ? ` (now ${ctx.targets.calories})` : ""} · {row.targets.proteinG} g protein ·{" "}
            <span className={row.status === "final" ? "text-success" : "text-[#F4C77A]"}>
              {row.status === "final" ? "QA passed" : "Draft — failed QA"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {deliverable ? (
            <a href={`/api/meal-plans/${row.id}/pdf`} className="btn">Download PDF</a>
          ) : (
            <span className="text-xs text-[#F4C77A] max-w-[22rem]">Download unavailable: {reasons.join(" ")}</span>
          )}
          <form action={deleteMealPlan}>
            <input type="hidden" name="id" value={row.id} />
            <input type="hidden" name="client_id" value={id} />
            <button type="submit" className="btn-danger">Delete</button>
          </form>
        </div>
      </div>

      <div className="card">
        <h2 className="display text-lg mb-2">QA {qa ? "(re-checked against the client now)" : ""}</h2>
        <ul className="text-sm space-y-1">
          {checks.map((c) => (
            <li key={c.name} className="flex gap-2">
              <span className={c.pass ? "text-success" : "text-alarm"} aria-hidden="true">{c.pass ? "✓" : "✗"}</span>
              <span>
                <span className="font-medium">{MEAL_QA_LABELS[c.name] ?? c.name}</span>
                <span className="sr-only">{c.pass ? " passed" : " failed"}</span>
                <span className="text-steel"> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="flag text-sm">
        Foods were screened against the client&apos;s recorded allergies, but brands differ in ingredients and
        cross-contact. The PDF tells the client to check every label.
      </p>

      {row.plan.days.map((d) => {
        const t = dayTotals(d, byId);
        return (
          <div key={d.day} className="card">
            <h2 className="display text-lg">Day {d.day}</h2>
            <p className="text-xs text-steel mb-3">
              {Math.round(t.kcal)} kcal · P {Math.round(t.protein)} g · F {Math.round(t.fat)} g · C {Math.round(t.carbs)} g
            </p>
            <div className="space-y-3">
              {d.meals.map((m, i) => (
                <div key={i}>
                  <h3 className="text-sm font-medium">{m.name}</h3>
                  <ul className="text-sm text-steel">
                    {m.items.map((it, j) => (
                      <li key={j}>{byId.get(it.food_id)?.name ?? "Unknown food"} — {it.grams} g</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        );
      })}

    </div>
  );
}
