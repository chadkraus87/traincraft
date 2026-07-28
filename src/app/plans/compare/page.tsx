import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import type { PlanJson } from "@/lib/types";

function uniqueExerciseNames(plan: PlanJson): Set<string> {
  const names = new Set<string>();
  for (const session of plan.sessions) {
    for (const block of session.blocks) names.add(block.name);
  }
  return names;
}

export default async function ComparePlans({
  searchParams,
}: {
  searchParams: Promise<{ a?: string; b?: string; client?: string }>;
}) {
  const { a, b, client: clientId } = await searchParams;
  if (!a || !b) notFound();

  const supabase = await supabaseServer();
  const [{ data: planA }, { data: planB }] = await Promise.all([
    supabase.from("workout_plans").select("id,title,status,created_at,plan").eq("id", a).single(),
    supabase.from("workout_plans").select("id,title,status,created_at,plan").eq("id", b).single(),
  ]);
  if (!planA || !planB) notFound();

  const jsonA = planA.plan as PlanJson;
  const jsonB = planB.plan as PlanJson;
  const namesA = uniqueExerciseNames(jsonA);
  const namesB = uniqueExerciseNames(jsonB);
  const onlyInA = [...namesA].filter((n) => !namesB.has(n));
  const onlyInB = [...namesB].filter((n) => !namesA.has(n));
  const inBoth = [...namesA].filter((n) => namesB.has(n));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="display text-3xl">Comparing plans</h1>
        {clientId && <Link href={`/clients/${clientId}`} className="text-sm text-coral underline">← Back to client</Link>}
      </div>

      <div className="card">
        <h2 className="display text-lg mb-3">What changed</h2>
        <div className="grid sm:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-xs text-steel uppercase tracking-wide mb-1">Only in &quot;{planA.title}&quot;</p>
            {onlyInA.length === 0 ? <p className="text-steel">—</p> : <ul className="space-y-0.5">{onlyInA.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>
          <div>
            <p className="text-xs text-steel uppercase tracking-wide mb-1">Only in &quot;{planB.title}&quot;</p>
            {onlyInB.length === 0 ? <p className="text-steel">—</p> : <ul className="space-y-0.5">{onlyInB.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>
          <div>
            <p className="text-xs text-steel uppercase tracking-wide mb-1">In both ({inBoth.length})</p>
            {inBoth.length === 0 ? <p className="text-steel">—</p> : <ul className="space-y-0.5 text-steel">{inBoth.map((n) => <li key={n}>{n}</li>)}</ul>}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {[{ row: planA, json: jsonA }, { row: planB, json: jsonB }].map(({ row, json }) => (
          <div key={row.id} className="card">
            <div className="flex items-center justify-between mb-1">
              <Link href={`/plans/${row.id}`} className="font-medium hover:text-coral">{row.title}</Link>
              <span className={`text-xs px-2 py-0.5 rounded-full ${row.status === "final" ? "bg-success/10 text-success" : "bg-signal/20 text-[#F4C77A]"}`}>
                {row.status === "final" ? "QA passed" : "Draft"}
              </span>
            </div>
            <p className="text-xs text-steel mb-3">{new Date(row.created_at).toLocaleDateString()}</p>
            {json.sessions.map((sess) => (
              <div key={sess.day} className="mb-3">
                <p className="text-sm font-medium mb-1">Day {sess.day} — {sess.focus}</p>
                <ul className="text-xs text-steel space-y-0.5">
                  {sess.blocks.map((b, i) => (
                    <li key={i}>{b.name} — {b.sets}×{b.reps} {b.load_note && `@ ${b.load_note}`}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
