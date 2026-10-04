import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser, hasAcceptedCurrentTerms } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { PRODUCT } from "@/lib/brand";
import { acceptTerms } from "./actions";

export default async function AcceptTerms() {
  const user = await requireUser({ skipTerms: true });
  const supabase = await supabaseServer();
  if (await hasAcceptedCurrentTerms(supabase, user.id)) redirect("/");

  // Each attestation is a separate checkbox on purpose. A single "I agree to
  // everything" box is weaker evidence that any one statement was read, and
  // the fitness-professional / no-medical-services statements are the ones
  // the whole legal model rests on.
  const statements = [
    ["attested_fitness_professional", "I'm a fitness professional using this to program for my own clients."],
    [
      "attested_no_medical_services",
      "I don't provide medical care, physical therapy, or medical nutrition therapy through this service, and I don't bill health insurance for anything I create with it.",
    ],
    ["attested_us_based", "I'm based in the United States and my clients are too."],
    ["attested_age_18", "I'm at least 18 years old."],
  ] as const;

  return (
    <div className="card max-w-xl mx-auto mt-10">
      <h1 className="display text-2xl mb-2">Before you continue</h1>
      <p className="text-sm text-steel mb-4">
        {PRODUCT.name} stores health information about your clients, so we need your agreement on a
        few things first. Please read the{" "}
        <Link href="/legal/terms" target="_blank" className="underline hover:text-coral">Terms of Service</Link>,{" "}
        <Link href="/legal/privacy" target="_blank" className="underline hover:text-coral">Privacy Policy</Link>, and{" "}
        <Link href="/legal/dpa" target="_blank" className="underline hover:text-coral">Data Processing Addendum</Link>.
      </p>

      <form action={acceptTerms} className="space-y-3">
        {statements.map(([name, text]) => (
          <label key={name} className="flex gap-3 text-sm items-start">
            <input type="checkbox" name={name} required className="mt-1" />
            <span>{text}</span>
          </label>
        ))}
        <label className="flex gap-3 text-sm items-start pt-2 border-t border-steel/10">
          <input type="checkbox" name="agree_documents" required className="mt-1" />
          <span>
            I agree to the Terms of Service and the Data Processing Addendum, and I&apos;ve read the
            Privacy Policy. I confirm I&apos;ll get my clients&apos; consent before storing their
            health information here.
          </span>
        </label>
        <button type="submit" className="btn w-full justify-center">Agree and continue</button>
      </form>

      <p className="text-xs text-steel mt-4">
        Don&apos;t agree? You can <Link href="/settings" className="underline">delete your account</Link> instead.
      </p>
    </div>
  );
}
