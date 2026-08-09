import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { PRODUCT } from "@/lib/brand";
import { saveTrainerProfile } from "./actions";

export default async function Settings({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { welcome } = await searchParams;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("trainer_profiles")
    .select("business_name, coach_name, credentials")
    .eq("trainer_id", user.id)
    .maybeSingle();

  return (
    <div className="max-w-xl">
      {welcome && (
        <div className="card mb-5 border-l-4 border-coral">
          <h1 className="display text-2xl mb-1">Welcome to {PRODUCT.name}</h1>
          <p className="text-sm text-steel">
            One quick thing first: tell us what to put on your clients&apos; plans. You can skip
            this and come back later — plans will just carry {PRODUCT.name} branding until you do.
          </p>
        </div>
      )}

      <div className="card">
        {!welcome && <h1 className="display text-2xl mb-1">Your branding</h1>}
        <p className="text-sm text-steel mb-5">
          This is what your clients see on the PDFs you send them.
        </p>

        <form action={saveTrainerProfile} className="space-y-4">
          <div>
            <label className="label" htmlFor="business_name">Business name</label>
            <input
              id="business_name"
              name="business_name"
              className="input"
              defaultValue={profile?.business_name ?? ""}
              placeholder="e.g. Alvarez Strength & Conditioning"
              maxLength={120}
            />
            <p className="text-xs text-steel mt-1">Appears in the header of every plan PDF.</p>
          </div>

          <div>
            <label className="label" htmlFor="coach_name">Your name</label>
            <input
              id="coach_name"
              name="coach_name"
              className="input"
              defaultValue={profile?.coach_name ?? ""}
              placeholder="e.g. Dana Alvarez"
              maxLength={120}
            />
            <p className="text-xs text-steel mt-1">
              Used for the &ldquo;Programmed by …&rdquo; line at the foot of a plan.
            </p>
          </div>

          <div>
            <label className="label" htmlFor="credentials">Credentials</label>
            <input
              id="credentials"
              name="credentials"
              className="input"
              defaultValue={profile?.credentials ?? ""}
              placeholder="e.g. CPT | PES | CNC"
              maxLength={120}
            />
            <p className="text-xs text-steel mt-1">
              Optional. Leave blank and the line is omitted entirely rather than left empty.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button type="submit" className="btn">Save</button>
            {welcome && (
              <Link href="/clients/new" className="btn-ghost">Skip — add my first client</Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
