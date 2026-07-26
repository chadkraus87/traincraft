import { supabaseServer } from "@/lib/supabase/server";
import { WORKOUT_TYPES } from "@/lib/safety/rules";
import BuildWorkoutForm from "@/components/BuildWorkoutForm";

export default async function NewWorkout({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const supabase = await supabaseServer();
  const { data: clients } = await supabase.from("clients").select("id, full_name").order("full_name");
  const workoutTypes = Object.entries(WORKOUT_TYPES).map(([key, v]) => ({ key, label: v.label }));

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Build a workout</h1>
      <p className="text-sm text-steel">Quickly generate a single session for a client — same safety pipeline as Build a Plan, without the multi-week setup.</p>
      {(clients ?? []).length === 0 ? (
        <p className="text-sm text-steel">Add a client first.</p>
      ) : (
        <BuildWorkoutForm clients={clients ?? []} workoutTypes={workoutTypes} defaultClient={client} />
      )}
    </div>
  );
}
