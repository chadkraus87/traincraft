import { supabaseServer } from "@/lib/supabase/server";
import { WORKOUT_TYPES } from "@/lib/safety/rules";
import GenerateForm from "@/components/GenerateForm";

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const supabase = await supabaseServer();
  const { data: clients } = await supabase.from("clients").select("id, full_name").order("full_name");
  const { data: templates } = await supabase.from("plan_templates").select("id, name").order("name");
  const workoutTypes = Object.entries(WORKOUT_TYPES).map(([key, v]) => ({ key, label: v.label }));

  // Client preference memory: if we already know which client this is for,
  // default to whatever they used last time instead of always resetting
  // to the generic defaults. Only possible when a client is pre-selected
  // (e.g. arriving from their profile page) — visiting /plans/new with no
  // client picked yet has nothing to base a default on.
  let lastPlan: { workout_type: string; weeks: number; days_per_week: number } | null = null;
  if (client) {
    const { data } = await supabase
      .from("workout_plans")
      .select("workout_type, weeks, days_per_week")
      .eq("client_id", client)
      .eq("is_single_workout", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    lastPlan = data;
  }

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Build a plan</h1>
      {(clients ?? []).length === 0 ? (
        <p className="text-sm text-steel">Add a client first.</p>
      ) : (
        <GenerateForm
          clients={clients ?? []}
          workoutTypes={workoutTypes}
          defaultClient={client}
          templates={templates ?? []}
          defaultWorkoutType={lastPlan?.workout_type}
          defaultWeeks={lastPlan?.weeks}
          defaultDays={lastPlan?.days_per_week}
        />
      )}
    </div>
  );
}
