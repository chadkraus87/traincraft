import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";

const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
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

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { count: clients },
    { count: plans },
    { count: passedPlans },
    { count: plansThisWeek },
    { data: recent },
  ] = await Promise.all([
    supabase.from("clients").select("*", { count: "exact", head: true }),
    supabase.from("workout_plans").select("*", { count: "exact", head: true }),
    supabase.from("workout_plans").select("*", { count: "exact", head: true }).eq("status", "final"),
    supabase.from("workout_plans").select("*", { count: "exact", head: true }).gte("created_at", weekAgo),
    supabase.from("workout_plans").select("id,title,status,created_at,clients(full_name)")
      .order("created_at", { ascending: false }).limit(5),
  ]);

  const qaPassRate = plans && plans > 0 ? Math.round(((passedPlans ?? 0) / plans) * 100) : 0;
  const ringOffset = RING_CIRCUMFERENCE * (1 - qaPassRate / 100);

  return (
    <div className="space-y-8">
      {welcome === "1" && (
        <div className="border-l-4 border-coral bg-coral/10 text-coral px-4 py-3 rounded-r-md text-sm">
          Account created — you're all set.
        </div>
      )}
      <div>
        <h1 className="display text-4xl">Your gym floor</h1>
        <p className="text-steel text-base mt-1">{clients ?? 0} clients · {plans ?? 0} plans built</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <div className="bg-signal rounded-xl p-4 flex flex-col items-center justify-center">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#B87A1F" strokeWidth="7" />
            <circle
              cx="36" cy="36" r={RING_RADIUS} fill="none" stroke="#1C1005" strokeWidth="7"
              strokeLinecap="round" strokeDasharray={RING_CIRCUMFERENCE} strokeDashoffset={ringOffset}
              transform="rotate(-90 36 36)"
            />
            <text x="36" y="41" textAnchor="middle" fontSize="20" fontWeight="600" fill="#1C1005">{qaPassRate}%</text>
          </svg>
          <p className="text-sm text-[#4A2410] mt-2">Plans QA-passed</p>
        </div>
        <div className="bg-coral rounded-xl p-4 flex flex-col justify-center">
          <p className="text-base text-[#4A2410]">Active clients</p>
          <p className="text-4xl font-medium text-[#1C1005] mt-1">{clients ?? 0}</p>
        </div>
        <div className="bg-success rounded-xl p-4 flex flex-col justify-center">
          <p className="text-base text-[#1F3712]">Plans this week</p>
          <p className="text-4xl font-medium text-[#12220A] mt-1">{plansThisWeek ?? 0}</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3">
        <Link href="/clients" className="bg-[#FFF6F2] hover:bg-[#FDECE3] rounded-xl p-4 transition-colors">
          <span className="text-lg font-medium text-[#A34526]">Clients →</span>
          <p className="text-sm text-steel mt-1">Rosters, injuries, equipment</p>
        </Link>
        <Link href="/plans/new" className="bg-[#FFF6F2] hover:bg-[#FDECE3] rounded-xl p-4 transition-colors">
          <span className="text-lg font-medium text-[#A34526]">Build a plan →</span>
          <p className="text-sm text-steel mt-1">AI programming with safety checks</p>
        </Link>
        <Link href="/exercises" className="bg-[#FFF6F2] hover:bg-[#FDECE3] rounded-xl p-4 transition-colors">
          <span className="text-lg font-medium text-[#A34526]">Library →</span>
          <p className="text-sm text-steel mt-1">Base + your custom exercises</p>
        </Link>
      </div>

      <div className="card">
        <h2 className="display text-2xl mb-3">Recent plans</h2>
        {(recent ?? []).length === 0 && <p className="text-base text-steel">No plans yet. Add a client, then build one.</p>}
        <ul className="divide-y divide-steel/10">
          {(recent ?? []).map((p) => (
            <li key={p.id} className="py-2 flex items-center justify-between">
              <Link href={`/plans/${p.id}`} className="text-base hover:text-coral">
                {p.title} <span className="text-steel">· {(p.clients as unknown as { full_name: string })?.full_name}</span>
              </Link>
              <span className={`text-sm px-2 py-0.5 rounded-full ${p.status === "final" ? "bg-success/10 text-success" : "bg-signal/20 text-[#F4C77A]"}`}>
                {p.status === "final" ? "QA passed" : "Draft — review QA"}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
