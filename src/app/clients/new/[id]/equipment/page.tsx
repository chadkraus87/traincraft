import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { EQUIPMENT_TYPES, equipmentLabel } from "@/lib/safety/rules";
import { addEquipment } from "../../../actions";
import WizardSteps from "@/components/WizardSteps";

export default async function OnboardingEquipment({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const [{ data: client }, { data: equipment }] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", id).single(),
    supabase.from("client_equipment").select("*").eq("client_id", id).order("created_at"),
  ]);

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="display text-3xl mb-2">{client?.full_name} — equipment</h1>
      <WizardSteps current={3} />
      <p className="text-sm text-steel mb-4">What do they have access to? Nothing logged means plans default to bodyweight only — add &quot;Full gym&quot; for in-person clients.</p>

      <div className="card">
        {(equipment ?? []).length > 0 && (
          <ul className="space-y-1 mb-3">
            {(equipment ?? []).map((e) => (
              <li key={e.id} className="text-sm">{e.label} ×{e.quantity}</li>
            ))}
          </ul>
        )}
        <form action={addEquipment} className="space-y-2">
          <input type="hidden" name="client_id" value={id} />
          <input name="label" required className="input" placeholder='Label, e.g. "25 lb kettlebell"' />
          <div className="grid grid-cols-3 gap-2">
            <select name="equipment_type" className="input col-span-1">
              {EQUIPMENT_TYPES.map((t) => <option key={t} value={t}>{equipmentLabel(t)}</option>)}
            </select>
            <input name="quantity" type="number" min={1} defaultValue={1} className="input" placeholder="Qty" />
            <input name="weight_lb" type="number" step="0.5" className="input" placeholder="lb" />
          </div>
          <button className="btn-ghost w-full justify-center">Add equipment</button>
        </form>
      </div>

      <Link href={`/clients/new/${id}/done`} className="btn w-full justify-center mt-4">
        Continue → Finish
      </Link>
    </div>
  );
}
