import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import WizardSteps from "@/components/WizardSteps";

export default async function OnboardingDone({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: client } = await supabase.from("clients").select("full_name").eq("id", id).single();

  return (
    <div className="max-w-xl mx-auto text-center">
      <h1 className="display text-3xl mb-2">{client?.full_name} is all set</h1>
      <WizardSteps current={4} />
      <p className="text-sm text-steel mb-6">Basics, limitations, and equipment are logged. Ready to build their first plan?</p>
      <div className="flex flex-col gap-3">
        <Link href={`/plans/new?client=${id}`} className="btn w-full justify-center">Build their first plan</Link>
        <Link href={`/clients/${id}`} className="btn-ghost w-full justify-center">Go to their profile instead</Link>
        <Link href="/clients/new" className="text-sm text-steel underline">Add another client</Link>
      </div>
    </div>
  );
}
