import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { LIMITATION_TAGS, LIMITATION_LABELS } from "@/lib/safety/rules";
import { addLimitation } from "../../../actions";
import WizardSteps from "@/components/WizardSteps";

export default async function OnboardingLimitations({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: client }, { data: limitations }] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", id).single(),
    supabase.from("client_limitations").select("*").eq("client_id", id).order("created_at"),
  ]);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="display text-3xl mb-2">{client?.full_name} — limitations</h1>
      <WizardSteps current={2} />
      <p className="text-sm text-steel mb-4">Any injuries or limitations to program around? Skip this if there aren't any yet — you can always add them later.</p>

      <div className="card">
        {(limitations ?? []).length > 0 && (
          <ul className="space-y-1 mb-3">
            {(limitations ?? []).map((l) => (
              <li key={l.id} className="text-sm">
                {LIMITATION_LABELS[l.tag as keyof typeof LIMITATION_LABELS] ?? l.tag}
                {l.detail && <span className="text-steel"> — {l.detail}</span>}
              </li>
            ))}
          </ul>
        )}
        <form action={addLimitation} className="space-y-2">
          <input type="hidden" name="client_id" value={id} />
          <select name="tag" className="input">
            {LIMITATION_TAGS.map((t) => <option key={t} value={t}>{LIMITATION_LABELS[t]}</option>)}
          </select>
          <input name="detail" className="input" placeholder="Context (e.g. left side, flares with overhead work)" />
          <button className="btn-ghost w-full justify-center">Add limitation</button>
        </form>
      </div>

      <Link href={`/clients/new/${id}/equipment`} className="btn w-full justify-center mt-4">
        Continue → Equipment
      </Link>
    </div>
  );
}
