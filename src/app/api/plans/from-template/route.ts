/**
 * POST /api/plans/from-template · applies a saved template to a client.
 *
 * Safety-critical: this is NOT a raw copy. The target client's real
 * limitations and equipment are queried fresh, the exact same
 * filterForLimitations/filterForEquipment pipeline generation uses
 * computes their actual safe pool, and validatePlan re-checks the
 * template's exercises against THAT pool — never trusting that a
 * template is safe just because it worked for whoever it was built for.
 * If the template references something contraindicated or unavailable
 * for this client, pool_membership fails, the plan saves as a flagged
 * draft, and the trainer can swap it via the normal plan editor (whose
 * picker is itself filtered the same way).
 *
 * No Claude call here — applying a template is free and fast, unlike
 * generation.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { filterForLimitations, filterForEquipment, WORKOUT_TYPES, type LimitationTag } from "@/lib/safety/rules";
import { validatePlan } from "@/lib/ai/validate";
import type { PlanJson } from "@/lib/types";

export async function POST(req: Request) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { templateId, clientId, title } = await req.json();
  if (!templateId || !clientId)
    return NextResponse.json({ error: "templateId and clientId required" }, { status: 400 });

  const [{ data: template }, { data: client }, { data: limitations }, { data: equipment }, { data: pool }] =
    await Promise.all([
      supabase.from("plan_templates").select("*").eq("id", templateId).single(),
      supabase.from("clients").select("*").eq("id", clientId).single(),
      supabase.from("client_limitations").select("*").eq("client_id", clientId).eq("active", true),
      supabase.from("client_equipment").select("*").eq("client_id", clientId),
      supabase.from("exercises").select("*").eq("is_active", true),
    ]);
  if (!template) return NextResponse.json({ error: "Template not found" }, { status: 404 });
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const limitationTags = (limitations ?? []).map((l) => l.tag as LimitationTag);
  const { allowed } = filterForLimitations(pool ?? [], limitationTags);
  const ownedTypes = (equipment ?? []).map((e) => e.equipment_type);
  const { usable } = filterForEquipment(allowed, ownedTypes);

  const plan = template.plan as PlanJson;

  const qa = validatePlan(
    plan,
    usable,
    limitationTags,
    template.workout_type as keyof typeof WORKOUT_TYPES,
    template.days_per_week
  );

  const { data: saved, error } = await supabase
    .from("workout_plans")
    .insert({
      trainer_id: user.id,
      client_id: clientId,
      title: title || `${template.name} — ${client.full_name}`,
      workout_type: template.workout_type,
      weeks: template.weeks,
      days_per_week: template.days_per_week,
      status: qa.passed ? "final" : "draft",
      plan,
      qa_report: qa,
      is_single_workout: false,
    })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ id: saved.id, qa });
}
