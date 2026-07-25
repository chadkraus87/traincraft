import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { planToPdf } from "@/lib/pdf";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: plan } = await supabase.from("workout_plans").select("*, clients(*)").eq("id", id).single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const buf = await planToPdf(plan.clients, plan.title, plan.plan, plan.weeks);
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${plan.title.replace(/[^a-z0-9 -]/gi, "")}.pdf"`,
    },
  });
}
