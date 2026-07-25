import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { LIMITATION_LABELS } from "@/lib/safety/rules";
import DeliverButtons from "@/components/DeliverButtons";
import DeletePlanButton from "@/components/DeletePlanButton";
import QaReportCard from "@/components/QaReportCard";
import type { PlanJson, QaReport } from "@/lib/types";

export default async function PlanView({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: planRow } = await supabase.from("workout_plans").select("*, clients(*)").eq("id", id).single();
  if (!planRow) notFound();

  const plan = planRow.plan as PlanJson;
  const qa = planRow.qa_report as QaReport | null;
  const client = planRow.clients;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="display text-3xl">{planRow.title}</h1>
          <p className="text-sm text-steel mt-1">
            {client.full_name} · {planRow.weeks} weeks · {planRow.days_per_week} days/week ·{" "}
            <span className={planRow.status === "final" ? "text-success" : "text-[#6B4408]"}>
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

      {qa && <QaReportCard qa={qa} />}

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

      {plan.sessions.map((sess) => (
        <div key={sess.day} className="card">
          <h2 className="display text-lg mb-3">Day {sess.day} — {sess.focus}</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-steel uppercase tracking-wider border-b border-coral/30">
                <th className="py-1.5 pr-2">Exercise</th><th className="py-1.5 pr-2">Sets</th>
                <th className="py-1.5 pr-2">Reps</th><th className="py-1.5 pr-2">Load</th><th className="py-1.5">Rest</th>
              </tr>
            </thead>
            <tbody>
              {sess.blocks.map((b, i) => (
                <tr key={i} className="border-b border-steel/10 align-top">
                  <td className="py-2 pr-2">
                    {b.name}
                    {b.coaching_note && <p className="text-xs text-steel">{b.coaching_note}</p>}
                  </td>
                  <td className="py-2 pr-2">{b.sets}</td>
                  <td className="py-2 pr-2">{b.reps}</td>
                  <td className="py-2 pr-2">{b.load_note}</td>
                  <td className="py-2">{b.rest_sec}s</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <div className="card">
        <h2 className="display text-lg mb-2">Progression</h2>
        <p className="text-sm whitespace-pre-wrap">{plan.progression_notes}</p>
      </div>
    </div>
  );
}
