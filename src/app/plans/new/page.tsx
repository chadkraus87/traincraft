import { supabaseServer } from "@/lib/supabase/server";
import { WORKOUT_TYPES } from "@/lib/safety/rules";
import GenerateForm from "@/components/GenerateForm";

export default async function NewPlan({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const { client } = await searchParams;
  const supabase = await supabaseServer();
  const { data: clients } = await supabase.from("clients").select("id, full_name").order("full_name");
  const { data: templates } = await supabase.from("plan_templates").select("id, name").order("name");
  const workoutTypes = Object.entries(WORKOUT_TYPES).map(([key, v]) => ({ key, label: v.label }));

  return (
    <div className="space-y-4">
      <h1 className="display text-3xl">Build a plan</h1>
      {(clients ?? []).length === 0 ? (
        <p className="text-sm text-steel">Add a client first.</p>
      ) : (
        <GenerateForm clients={clients ?? []} workoutTypes={workoutTypes} defaultClient={client} templates={templates ?? []} />
      )}
    </div>
  );
}
