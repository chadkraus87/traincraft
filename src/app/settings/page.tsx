import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { PRODUCT } from "@/lib/brand";
import TrainerProfileForm from "@/components/TrainerProfileForm";

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
    .select("business_name, coach_name, credentials, phone")
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

        <TrainerProfileForm profile={profile ?? null} showSkip={!!welcome} />
      </div>
    </div>
  );
}
