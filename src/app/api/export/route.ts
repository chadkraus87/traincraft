/**
 * GET /api/export · downloads a full JSON backup of everything this
 * trainer owns: clients, limitations, equipment, plans (including plan
 * content + QA reports), exercise logs, notes, plan templates, and any
 * custom exercises they've added (not the shared base library — that's
 * identical for every deployment and reconstructable from the seed
 * migrations, no need to include it in a personal backup).
 * JSON rather than CSV deliberately — several tables have array/nested
 * fields (limitation tags, plan session structure) that don't represent
 * cleanly in flat CSV rows without lossy flattening.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const [
    clients,
    limitations,
    equipment,
    plans,
    logs,
    notes,
    templates,
    customExercises,
    deliveries,
  ] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("client_limitations").select("*"),
    supabase.from("client_equipment").select("*"),
    supabase.from("workout_plans").select("*"),
    supabase.from("exercise_logs").select("*"),
    supabase.from("client_notes").select("*"),
    supabase.from("plan_templates").select("*"),
    supabase.from("exercises").select("*").eq("trainer_id", user.id),
    supabase.from("deliveries").select("*"),
  ]);

  const backup = {
    exported_at: new Date().toISOString(),
    trainer_id: user.id,
    clients: clients.data ?? [],
    client_limitations: limitations.data ?? [],
    client_equipment: equipment.data ?? [],
    workout_plans: plans.data ?? [],
    exercise_logs: logs.data ?? [],
    client_notes: notes.data ?? [],
    plan_templates: templates.data ?? [],
    custom_exercises: customExercises.data ?? [],
    deliveries: deliveries.data ?? [],
  };

  const filename = `traincraft-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
