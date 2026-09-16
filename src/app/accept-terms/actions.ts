"use server";
import { redirect } from "next/navigation";
import { requireUserOrThrow } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { LEGAL_VERSIONS } from "@/lib/legal";

const REQUIRED = [
  "agree_documents",
  "attested_fitness_professional",
  "attested_no_medical_services",
  "attested_us_based",
  "attested_age_18",
] as const;

export async function acceptTerms(form: FormData) {
  const user = await requireUserOrThrow();

  // Every box is re-checked here. The browser's `required` attribute is a
  // convenience; the database CHECK constraints are the backstop; this is the
  // layer that returns a sensible error in between.
  for (const key of REQUIRED) {
    if (form.get(key) !== "on") throw new Error("Every statement must be accepted to continue.");
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.from("legal_acceptances").insert({
    trainer_id: user.id,
    terms_version: LEGAL_VERSIONS.terms,
    privacy_version: LEGAL_VERSIONS.privacy,
    dpa_version: LEGAL_VERSIONS.dpa,
    attested_fitness_professional: true,
    attested_no_medical_services: true,
    attested_us_based: true,
    attested_age_18: true,
  });
  if (error) throw new Error(error.message);

  redirect("/");
}
