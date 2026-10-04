import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { planToPdf } from "@/lib/pdf";
import { getTrainerBrand } from "@/lib/brand-server";
import { loadProgrammingGate } from "@/lib/intake/screening";
import type { PlanJson, QaReport } from "@/lib/types";
import { deriveQaForStoredPlan, isDeliverable } from "@/lib/ai/plan-qa";
import { hasAcceptedCurrentTerms, TERMS_REQUIRED } from "@/lib/auth";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // RLS on workout_plans already reduces this to the caller's own rows, so
  // an unauthenticated request would 404 anyway. The explicit check is here
  // so authorization doesn't rest solely on a policy in another file, and so
  // a signed-out user gets an honest 401 instead of "plan not found".
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Terms gate, same as the pages. A route that processes client health data
  // must not run for a trainer who hasn't accepted the current versions.
  if (!(await hasAcceptedCurrentTerms(supabase, user.id))) {
    return NextResponse.json({ error: TERMS_REQUIRED, termsRequired: true }, { status: 403 });
  }

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*, clients(*)")
    .eq("id", id)
    .single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // A plan generated while the client was cleared must not be handed over
  // after their screening lapses or reports symptoms — sending it is the
  // moment the plan reaches the person the gate protects.
  const screening = await loadProgrammingGate(supabase, plan.client_id);
  if (!screening.allowed) {
    return NextResponse.json({ error: screening.reasons.join(" ") }, { status: 409 });
  }

  // QA gates delivery, and the verdict is recomputed here rather than read
  // off the stored status. Two reasons: a stored "final" can be stale (the
  // client may have had an injury logged since the plan was built), and this
  // endpoint must not be a way around the same gate the UI applies. The
  // trainer's recorded sign-off is still honoured for flags they reviewed.
  const storedQa = plan.qa_report as QaReport | null;
  const liveQa = await deriveQaForStoredPlan(supabase, plan, plan.plan as PlanJson, storedQa?.attempts ?? 1);
  if (!isDeliverable(storedQa, liveQa)) {
    return NextResponse.json(
      {
        error:
          "This plan hasn't cleared QA. Open it in CoachRhythm, review the flagged checks, and confirm it's safe to send — then you can download the PDF.",
      },
      { status: 409 }
    );
  }

  const brand = await getTrainerBrand(user.id);
  const buf = await planToPdf(plan.clients, plan.title, plan.plan, plan.weeks, brand);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${plan.title.replace(/[^a-z0-9 -]/gi, "")}.pdf"`,
    },
  });
}
