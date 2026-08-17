import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { LIMITATION_LABELS, filterForLimitations, filterForEquipment, type LimitationTag } from "@/lib/safety/rules";
import DeliverButtons from "@/components/DeliverButtons";
import DeletePlanButton from "@/components/DeletePlanButton";
import SaveTemplateButton from "@/components/SaveTemplateButton";
import QaReportEditor from "@/components/QaReportEditor";
import PlanEditor from "@/components/PlanEditor";
import type { PlanJson, QaCheck, QaReport } from "@/lib/types";
import { deriveQaForStoredPlan, isDeliverable } from "@/lib/ai/plan-qa";
import { QA_CHECK_LABELS } from "@/lib/ai/validate";

export default async function PlanView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  await requireUser();
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

  // Re-validate the stored plan against the client as they are RIGHT NOW.
  //
  // qa_report is a snapshot taken at generation time. If the trainer logs a
  // shoulder impingement two weeks later, the plan keeps displaying "QA
  // passed" in green and keeps listing the overhead press that is now
  // contraindicated — the safety engine has an answer, nobody re-asked it.
  // The check is pure and the pool is already loaded for the editor picker,
  // so re-running it here costs nothing.
  //
  // The stored report stays authoritative for the review UI (it carries the
  // trainer's notes and dismissals); this only drives the warning banner.
  const liveQa = await deriveQaForStoredPlan(supabase, planRow, plan, qa?.attempts ?? 1);
  const newlyFailing = liveQa.checks.filter(
    (c) => !c.pass && qa?.checks.find((s) => s.name === c.name)?.pass !== false
  );
  const staleQa = newlyFailing.length > 0;

  // A prior sign-off covered the plan as it was against the client as they
  // were. A newly-logged injury invalidates it, so a regression blocks
  // delivery regardless of what the stored report says. Same helper the PDF
  // route uses, so the URL can't be used to route around this.
  const deliverable = isDeliverable(qa, liveQa);

  const { data: deliveries } = await supabase
    .from("deliveries")
    .select("*")
    .eq("plan_id", planRow.id)
    .order("created_at", { ascending: false });

  // Weekly volume per muscle group — total sets across every session,
  // attributed to each muscle the exercise targets. Uses the full
  // exercise pool (not the safety-filtered one) so this display never
  // breaks even if a client's limitations changed after the plan was
  // built.
  const exerciseById = new Map((exercisePool ?? []).map((e) => [e.id, e]));
  const volumeByMuscle = new Map<string, number>();
  for (const session of plan.sessions) {
    for (const block of session.blocks) {
      const ex = exerciseById.get(block.exercise_id);
      if (!ex) continue;
      for (const muscle of ex.muscle_groups) {
        volumeByMuscle.set(muscle, (volumeByMuscle.get(muscle) ?? 0) + block.sets);
      }
    }
  }
  const volumeSorted = [...volumeByMuscle.entries()].sort((a, b) => b[1] - a[1]);
  const maxSets = volumeSorted[0]?.[1] ?? 1;

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
          {/* Delivery is gated on QA, matching the PDF route. Hiding the
              buttons rather than disabling them keeps the reason visible:
              the review panel directly below is where the trainer resolves
              it, either by fixing the plan or by confirming they've handled
              the flags themselves. */}
          {deliverable ? (
            <DeliverButtons
              planId={planRow.id}
              planTitle={planRow.title}
              clientName={client.full_name}
              clientEmail={client.email}
            />
          ) : (
            <span className="text-xs text-[#F4C77A] max-w-[22rem]">
              Sending is unavailable until this plan clears QA — review the flagged checks below and
              confirm it&apos;s safe to send.
            </span>
          )}
          {!planRow.is_single_workout && <SaveTemplateButton planId={planRow.id} />}
          <DeletePlanButton planId={planRow.id} clientId={client.id} planTitle={planRow.title} />
        </div>
      </div>

      {staleQa && (
        <div className="card mb-4 border-l-4 border-alarm">
          <h2 className="display text-sm text-alarm mb-1">
            This client has changed since the plan was built
          </h2>
          <p className="text-sm text-steel mb-2">
            Re-checking the plan against {client.full_name}&apos;s current limitations and equipment
            turns up {newlyFailing.length} issue{newlyFailing.length > 1 ? "s" : ""} that
            {newlyFailing.length > 1 ? " were" : " was"} not present when it was generated:
          </p>
          <ul className="text-sm space-y-1 mb-3">
            {newlyFailing.map((c) => (
              <li key={c.name} className="flex gap-2">
                <span className="text-alarm shrink-0">✗</span>
                <span>
                  <span className="font-medium">{QA_CHECK_LABELS[c.name] ?? c.name}</span>
                  <span className="text-steel"> — {c.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-steel">
            Edit the plan to resolve these — saving re-runs the full safety check. Sending is
            blocked until then.
          </p>
        </div>
      )}

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

      <PlanEditor planId={planRow.id} clientId={client.id} initialPlan={plan} pool={usable} isSingleWorkout={planRow.is_single_workout} />

      {volumeSorted.length > 0 && (
        <div className="card">
          <h2 className="display text-lg mb-3">Weekly volume by muscle group</h2>
          <p className="text-xs text-steel mb-3">Total sets per muscle across every session in this {planRow.is_single_workout ? "workout" : "week"}.</p>
          <div className="space-y-1.5">
            {volumeSorted.map(([muscle, sets]) => (
              <div key={muscle} className="flex items-center gap-2">
                <span className="text-xs text-steel w-24 shrink-0 capitalize">{muscle.replace(/_/g, " ")}</span>
                <div className="flex-1 bg-steel/10 rounded-full h-3 overflow-hidden">
                  <div className="bg-coral h-full rounded-full" style={{ width: `${(sets / maxSets) * 100}%` }} />
                </div>
                <span className="text-xs text-steel w-16 text-right shrink-0">{sets} sets</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(deliveries ?? []).length > 0 && (
        <div className="card">
          <h2 className="display text-lg mb-2">Delivery history</h2>
          <p className="text-xs text-steel mb-2">Trainer-confirmed — the app can&apos;t automatically detect whether an email actually sent.</p>
          <ul className="text-sm space-y-1">
            {(deliveries ?? []).map((d) => (
              <li key={d.id} className="text-steel">
                {d.channel} to {d.destination} · {new Date(d.created_at).toLocaleString()}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
