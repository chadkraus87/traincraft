import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { planToPdf } from "@/lib/pdf";
import { getTrainerBrand } from "@/lib/brand-server";
import type { QaReport } from "@/lib/types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();

  // RLS on workout_plans already reduces this to the caller's own rows, so
  // an unauthenticated request would 404 anyway. The explicit check is here
  // so authorization doesn't rest solely on a policy in another file, and so
  // a signed-out user gets an honest 401 instead of "plan not found".
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: plan } = await supabase
    .from("workout_plans")
    .select("*, clients(*)")
    .eq("id", id)
    .single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  // QA gates delivery. A plan is sendable when the validator cleared it, or
  // when the trainer has reviewed the open flags and taken responsibility
  // for them. Without this the PDF endpoint would hand out a plan that
  // failed a contraindication check to anyone who guessed the URL of their
  // own draft — and the whole point of the QA pass is that unvalidated
  // output doesn't reach a client.
  const qa = plan.qa_report as QaReport | null;
  const deliverable = plan.status === "final" || qa?.trainerConfirmed === true;
  if (!deliverable) {
    return NextResponse.json(
      {
        error:
          "This plan hasn't cleared QA yet. Open it, review the flagged checks, and confirm it's safe to send — then you can download the PDF.",
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
