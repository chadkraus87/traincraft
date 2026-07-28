import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { addClient } from "./actions";

export default async function ClientsPage() {
  const supabase = await supabaseServer();
  const { data: clients } = await supabase.from("clients").select("*").order("full_name");

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-6">
      <div>
        <h1 className="display text-3xl mb-4">Clients</h1>
        {(clients ?? []).length === 0 && (
          <p className="text-sm text-steel">No clients yet — add your first on the right.</p>
        )}
        <ul className="space-y-2">
          {(clients ?? []).map((c) => (
            <li key={c.id}>
              <Link href={`/clients/${c.id}`} className="card flex items-center justify-between hover:border-coral">
                <div>
                  <p className="font-medium">{c.full_name}</p>
                  <p className="text-xs text-steel">{c.goals ?? "No goals logged"}</p>
                </div>
                {c.is_remote && <span className="text-xs px-2 py-0.5 rounded-full bg-terracotta/20 text-coral">Remote</span>}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <aside className="card h-fit">
        <h2 className="display text-lg mb-3">Add client</h2>
        <p className="text-xs text-steel mb-3">
          New client? Try the <a href="/clients/new" className="text-coral underline">guided setup</a> instead — walks through limitations and equipment step by step.
        </p>
        <form action={addClient} className="space-y-3">
          <div><span className="label">Full name</span><input name="full_name" required className="input" /></div>
          <div><span className="label">Email</span><input name="email" type="email" className="input" /></div>
          <div><span className="label">Phone (optional)</span><input name="phone" className="input" placeholder="(512) 555-0100" /></div>
          <div><span className="label">Goals</span><input name="goals" className="input" placeholder="Fat loss, first pull-up" /></div>
          <div><span className="label">Training history / notes</span><textarea name="training_history" rows={3} className="input" /></div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_remote" /> Remote client (home equipment only)</label>
          <button className="btn w-full justify-center">Add client</button>
        </form>
      </aside>
    </div>
  );
}
