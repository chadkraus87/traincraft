import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LIMITATION_LABELS, filterForLimitations, filterForEquipment, type LimitationTag } from "@/lib/safety/rules";
import DeliverButtons from "@/components/DeliverButtons";
import DeletePlanButton from "@/components/DeletePlanButton";
import QaReportEditor from "@/components/QaReportEditor";
import PlanEditor from "@/components/PlanEditor";
import type { PlanJson, QaReport } from "@/lib/types";

export default async function PlanView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: planRow } = await supabase.from("workout_plans").select("*, clients(*)").eq("id", id).single();
  if (!planRow) notFound();

  const plan = planRow.plan as PlanJson;
  const qa = planRow.qa_report as QaReport | null;
  const client = planRow.clients;

  // Same safety + equipment filter the generator uses, recomputed here so
  // the plan editor's "add/swap exercise" picker can never offer anything
  // contraindicated or unavailable for this client.
  const [{ data: limitations }, { data: equipment }, { data: exercisePool }] = await Promise.all([
    supabase.from("client_limitations").select("*").eq("client_id", client.id).eq("active", true),
    supabase.from("client_equipment").select("*").eq("client_id", client.id),
    supabase.from("exercises").select("*").eq("is_active", true),
  ]);
  const limitationTags = (limitations ?? []).map((l) => l.tag as LimitationTag);
  const { allowed } = filterForLimitations(exercisePool ?? [], limitationTags);
  const ownedTypes = (equipment ?? []).map((e) => e.equipment_type);
  const { usable } = filterForEquipment(allowed, ownedTypes);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-3xl">{planRow.title}</h1>
          <p className="text-sm text-steel mt-1">
            {client.full_name} ·{" "}
            {planRow.is_single_workout ? "Single workout" : `${planRow.weeks} weeks · ${planRow.days_per_week} days/week`} ·{" "}
            <span className={planRow.status === "final" ? "text-success" : "text-[#F4C77A]"}>
              {planRow.status === "final" ? "QA passed" : "Draft — QA flagged issues below"}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DeliverButtons
            planId={planRow.id}
            planTitle={planRow.title}
            clientName={client.full_name}
            clientEmail={client.email}
          />
          <DeletePlanButton planId={planRow.id} clientId={client.id} planTitle={planRow.title} />
        </div>
      </div>

      {qa && <QaReportEditor planId={planRow.id} initialQa={qa} />}

      {plan.exclusions.length > 0 && (
        <div className="flag">
          <p className="font-medium mb-1">Spotter&apos;s notes — excluded for {client.full_name.split(" ")[0]}&apos;s limitations</p>
          <ul className="space-y-1 text-sm">
            {plan.exclusions.map((x, i) => (
              <li key={i}>
                <span className="font-medium">{x.exercise_name}</span>{" "}
                ({LIMITATION_LABELS[x.limitation_tag as keyof typeof LIMITATION_LABELS] ?? x.limitation_tag}) — {x.reason}
                {x.prefer_instead && <span className="text-steel"> Instead: {x.prefer_instead}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlanEditor planId={planRow.id} initialPlan={plan} pool={usable} isSingleWorkout={planRow.is_single_workout} />
    </div>
  );
}
