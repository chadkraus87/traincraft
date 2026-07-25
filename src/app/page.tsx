import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className="card max-w-md mx-auto mt-16 text-center">
        <h1 className="display text-2xl mb-2">Welcome to TrainCraft</h1>
        <p className="text-sm text-steel mb-4">Sign in to manage your clients and build plans.</p>
        <Link href="/login" className="btn">Sign in</Link>
      </div>
    );
  }

  const [{ count: clients }, { count: plans }, { data: recent }] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("workout_plans").select("*", { count: "exact", head: true }),
    supabase.from("workout_plans").select("id,title,status,created_at,clients(full_name)")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="display text-3xl">Your gym floor</h1>
        <p className="text-steel text-sm mt-1">{clients ?? 0} clients · {plans ?? 0} plans built</p>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/clients" className="card hover:border-pine"><span className="display text-sm text-pine">Clients →</span><p className="text-sm text-steel mt-1">Rosters, injuries, equipment</p></Link>
        <Link href="/plans/new" className="card hover:border-pine"><span className="display text-sm text-pine">Build a plan →</span><p className="text-sm text-steel mt-1">AI programming with safety checks</p></Link>
        <Link href="/exercises" className="card hover:border-pine"><span className="display text-sm text-pine">Library →</span><p className="text-sm text-steel mt-1">Base + your custom exercises</p></Link>
      </div>
      <div className="card">
        <h2 className="display text-lg mb-3">Recent plans</h2>
        {(recent ?? []).length === 0 && <p className="text-sm text-steel">No plans yet. Add a client, then build one.</p>}
        <ul className="divide-y divide-steel/10">
          {(recent ?? []).map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <Link href={`/plans/${p.id}`} className="text-sm hover:text-pine">
                {p.title} <span className="text-steel">· {(p.clients as unknown as { full_name: string })?.full_name}</span>
              </Link>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "final" ? "bg-pine/10 text-pine" : "bg-signal/20 text-alarm"}`}>
                {p.status === "final" ? "QA passed" : "Draft — review QA"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
