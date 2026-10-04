"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUserOrThrow } from "@/lib/auth";
import { isKnownLimitationTag } from "@/lib/safety/rules";
import type { PlanJson } from "@/lib/types";
import { MEASUREMENT_FIELDS, CHECKIN_FIELDS } from "@/lib/progress";
import { ALLERGENS, DIETS, MEDICATIONS, LIFE_STAGES } from "@/lib/nutrition/gates";
import { ACTIVITY_LEVELS, GOALS } from "@/lib/nutrition/macros";

/**
 * Awaits a Supabase write and throws if it failed.
 *
 * A write blocked by row-level security does not raise — it reports success
 * having affected nothing. Without this, a policy regression would look
 * exactly like a working app to both the trainer and any later audit: the
 * form submits, the page revalidates, and the row simply isn't there.
 */
async function must(op: PromiseLike<{ error: { message: string } | null }>): Promise<void> {
  const { error } = await op;
  if (error) throw new Error(error.message);
}

async function uid() {
  const supabase = await supabaseServer();
  // requireUserOrThrow also enforces terms acceptance.
  const user = await requireUserOrThrow();
  return { supabase, userId: user.id };
}

export async function addClient(form: FormData) {
  const { supabase, userId } = await uid();
  await must(
    supabase.from("clients").insert({
    trainer_id: userId,
    full_name: String(form.get("full_name")),
    email: String(form.get("email") || "") || null,
    phone: String(form.get("phone") || "") || null,
    goals: String(form.get("goals") || "") || null,
    training_history: String(form.get("training_history") || "") || null,
    is_remote: form.get("is_remote") === "on",
    })
  );
  revalidatePath("/clients");
}

export async function createClientForOnboarding(form: FormData) {
  const { supabase, userId } = await uid();
  const { data, error } = await supabase.from("clients").insert({
    trainer_id: userId,
    full_name: String(form.get("full_name")),
    email: String(form.get("email") || "") || null,
    phone: String(form.get("phone") || "") || null,
    goals: String(form.get("goals") || "") || null,
    training_history: String(form.get("training_history") || "") || null,
    is_remote: form.get("is_remote") === "on",
  }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Could not create client");
  redirect(`/clients/new/${data.id}/limitations`);
}

export async function updateClient(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("id"));
  await must(
    supabase
    .from("clients")
    .update({
    full_name: String(form.get("full_name")),
    email: String(form.get("email") || "") || null,
    phone: String(form.get("phone") || "") || null,
    goals: String(form.get("goals") || "") || null,
    training_history: String(form.get("training_history") || "") || null,
    is_remote: form.get("is_remote") === "on",
    })
    .eq("id", clientId)
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("id"));
  await must(
    supabase.from("clients").delete().eq("id", clientId)
  );
  revalidatePath("/clients");
  redirect("/clients");
}

export async function addLimitation(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const tag = String(form.get("tag"));

  // The <select> in the UI is the only thing that used to constrain this,
  // and a client-side control is not a validation. A tag with no rule behind
  // it silently disables filtering for that injury, so reject it at the
  // door — the database has a matching CHECK constraint as the backstop.
  if (!isKnownLimitationTag(tag)) {
    throw new Error(
      `"${tag}" is not a supported limitation type. The safety engine has no screening rule for it, so it cannot be logged.`
    );
  }

  // `side` replaced a free-text "context" box. Constrained on purpose: the
  // old field collected clinical narrative — diagnoses, medications, surgery
  // dates — that nothing in the app ever read, in exchange for holding the
  // most sensitive category of data in the schema. Anything outside the
  // three accepted values is discarded rather than stored.
  const rawSide = String(form.get("side") || "");
  const side = ["left", "right", "bilateral"].includes(rawSide) ? rawSide : null;

  const { error } = await supabase.from("client_limitations").insert({
    trainer_id: userId,
    client_id: clientId,
    tag,
    side,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/new/${clientId}/limitations`);
}

export async function toggleLimitation(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(
    supabase.from("client_limitations")
    .update({ active: form.get("active") === "true" })
    .eq("id", String(form.get("id")))
  );
  revalidatePath(`/clients/${clientId}`);
}

/**
 * Permanently removes a limitation, for one logged in error.
 *
 * Distinct from "Mark resolved", which is the right action for an injury
 * that healed — that keeps the history, and the client's record should show
 * that they once had a lumbar disc injury. This is for the case where the
 * entry is simply wrong: a mis-click, or the wrong client. Keeping a
 * mistaken injury on someone's record isn't caution, it's an inaccurate
 * medical note that will keep narrowing their programming forever.
 */
export async function deleteLimitation(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const limitationId = String(form.get("id"));

  // Read the tag before deleting — it's the key to the copies below.
  const { data: limitation } = await supabase
    .from("client_limitations")
    .select("tag")
    .eq("id", limitationId)
    .single();

  await must(supabase.from("client_limitations").delete().eq("id", limitationId));

  // Deleting the row is not the same as deleting the information.
  //
  // Every plan generated while this limitation was active carries a copy of
  // it inside plan.exclusions — the exercise that was removed, the tag, and
  // the clinical rationale. That is the same health claim about the same
  // person, written into a second table that no foreign key cascades from.
  // A trainer who deletes a mis-logged "lumbar disc injury" would reasonably
  // believe it was gone, and it would still be sitting in the JSON of every
  // past plan, and printed on the PDF their client receives.
  //
  // So the delete reaches the copies. Scoped to this client's plans and to
  // this tag, so unrelated exclusions are untouched.
  if (limitation?.tag) {
    const { data: plans } = await supabase
      .from("workout_plans")
      .select("id, plan")
      .eq("client_id", clientId);

    for (const row of plans ?? []) {
      const plan = row.plan as PlanJson;
      const remaining = (plan.exclusions ?? []).filter(
        (e) => e.limitation_tag !== limitation.tag
      );
      if (remaining.length === (plan.exclusions ?? []).length) continue;

      await must(
        supabase
          .from("workout_plans")
          .update({ plan: { ...plan, exclusions: remaining } })
          .eq("id", row.id)
      );
      revalidatePath(`/plans/${row.id}`);
    }
  }

  revalidatePath(`/clients/${clientId}`);
  // Any plan built while this limitation was active is now evaluated against
  // a different client picture, so drop cached plan pages too.
  revalidatePath("/");
}

export async function addEquipment(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const weight = String(form.get("weight_lb") || "");
  await must(
    supabase.from("client_equipment").insert({
    trainer_id: userId,
    client_id: clientId,
    label: String(form.get("label")),
    equipment_type: String(form.get("equipment_type")),
    quantity: Number(form.get("quantity") || 1),
    weight_lb: weight ? Number(weight) : null,
    })
  );
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/new/${clientId}/equipment`);
}

export async function removeEquipment(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(
    supabase.from("client_equipment").delete().eq("id", String(form.get("id")))
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function addGoal(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const description = String(form.get("description") || "").trim();
  if (!description) return;
  const targetDate = String(form.get("target_date") || "");
  await must(
    supabase.from("client_goals").insert({
    trainer_id: userId,
    client_id: clientId,
    description,
    target_date: targetDate || null,
    })
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function toggleGoalComplete(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(
    supabase.from("client_goals")
    .update({ completed: form.get("completed") === "true" })
    .eq("id", String(form.get("id")))
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteGoal(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(
    supabase.from("client_goals").delete().eq("id", String(form.get("id")))
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function addClientNote(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const note = String(form.get("note") || "").trim();
  if (!note) return;
  await must(
    supabase.from("client_notes").insert({
    trainer_id: userId,
    client_id: clientId,
    note,
    })
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientNote(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const noteId = String(form.get("id"));
  const note = String(form.get("note") || "").trim();
  if (!note) return;
  await must(
    supabase.from("client_notes").update({ note }).eq("id", noteId)
  );
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientNote(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const noteId = String(form.get("id"));
  await must(
    supabase.from("client_notes").delete().eq("id", noteId)
  );
  revalidatePath(`/clients/${clientId}`);
}

// ── Intake ──────────────────────────────────────────────────────────────

const SCREENING_QUESTIONS = [
  "currently_active",
  "known_cardiovascular_disease",
  "known_metabolic_disease",
  "known_renal_disease",
  "has_symptoms",
  "eating_disorder_history",
] as const;

/**
 * Records a new screening. Append-only: there is no update path, so a
 * correction is a fresh screening and the history of what was attested, and
 * when, is preserved.
 *
 * Every health question must be answered yes or no explicitly. An unticked
 * checkbox can't distinguish "no" from "skipped", and a skipped symptom
 * question silently becoming "no symptoms" is the same fail-open shape as the
 * `if (!rule) continue` bug this codebase already paid for once.
 */
export async function recordScreening(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));

  const answers: Record<string, boolean> = {};
  for (const q of SCREENING_QUESTIONS) {
    const v = form.get(q);
    if (v !== "yes" && v !== "no") throw new Error("Answer every screening question yes or no.");
    answers[q] = v === "yes";
  }
  if (form.get("consent_data_storage") !== "on") {
    throw new Error("You need the client's consent before storing their health information.");
  }

  const clearance = String(form.get("clearance_obtained_on") || "");
  const todayIso = new Date().toISOString().slice(0, 10);
  if (clearance && (!/^\d{4}-\d{2}-\d{2}$/.test(clearance) || clearance > todayIso)) {
    throw new Error("Medical clearance date can't be in the future.");
  }
  await must(
    supabase.from("client_screenings").insert({
      trainer_id: userId,
      client_id: clientId,
      ...answers,
      consent_data_storage: true,
      waiver_signed: form.get("waiver_signed") === "on",
      clearance_obtained_on: clearance || null,
    })
  );
  revalidatePath(`/clients/${clientId}/intake`);
  revalidatePath(`/clients/${clientId}`);
}

/** Inputs for the energy equations. All optional until nutrition needs them. */
export async function updateClientBasics(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const num = (key: string) => {
    const v = Number(form.get(key));
    return Number.isFinite(v) && v > 0 ? v : null;
  };
  const feet = num("height_ft");
  const inches = Number(form.get("height_in_part") || 0);
  const sex = String(form.get("sex_for_calculations") || "");

  await must(
    supabase
      .from("clients")
      .update({
        birth_year: num("birth_year"),
        height_in: feet ? Math.round((feet * 12 + (Number.isFinite(inches) ? inches : 0)) * 10) / 10 : null,
        sex_for_calculations: sex === "male" || sex === "female" ? sex : null,
      })
      .eq("id", clientId)
  );
  revalidatePath(`/clients/${clientId}/intake`);
}

// ── Progress ────────────────────────────────────────────────────────────


const isoDate = (v: FormDataEntryValue | null) => {
  const s = String(v || "");
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : new Date().toISOString().slice(0, 10);
};

export async function addMeasurement(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));

  const row: Record<string, number | null> = {};
  let any = false;
  for (const f of MEASUREMENT_FIELDS) {
    const raw = String(form.get(f.key) ?? "").trim();
    if (!raw) { row[f.key] = null; continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < f.min || n > f.max) {
      throw new Error(`${f.label} must be between ${f.min} and ${f.max} ${f.unit}.`);
    }
    row[f.key] = n;
    any = true;
  }
  if (!any) throw new Error("Enter at least one measurement.");

  await must(
    supabase.from("client_measurements").insert({
      trainer_id: userId,
      client_id: clientId,
      measured_on: isoDate(form.get("measured_on")),
      ...row,
    })
  );
  revalidatePath(`/clients/${clientId}/progress`);
}

export async function deleteMeasurement(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(supabase.from("client_measurements").delete().eq("id", String(form.get("id"))));
  revalidatePath(`/clients/${clientId}/progress`);
}

export async function addCheckin(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const scores: Record<string, number> = {};
  for (const f of CHECKIN_FIELDS) {
    const n = Number(form.get(f.key));
    if (!Number.isInteger(n) || n < 1 || n > 5) throw new Error(`Score ${f.label.toLowerCase()} from 1 to 5.`);
    scores[f.key] = n;
  }
  await must(
    supabase.from("client_checkins").insert({
      trainer_id: userId,
      client_id: clientId,
      checked_in_on: isoDate(form.get("checked_in_on")),
      ...scores,
    })
  );
  revalidatePath(`/clients/${clientId}/progress`);
}

export async function saveNutritionProfile(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const pick = <T extends string>(key: string, allowed: readonly T[]): T => {
    const v = String(form.get(key));
    if (!(allowed as readonly string[]).includes(v)) throw new Error(`Choose a valid ${key.replace("_", " ")}.`);
    return v as T;
  };
  const allergens = form.getAll("allergens").map(String);
  if (allergens.some((a) => !(ALLERGENS as readonly string[]).includes(a))) throw new Error("Unrecognised allergen.");
  const medications = form.getAll("medications").map(String);
  if (medications.some((m) => !(MEDICATIONS as readonly string[]).includes(m))) throw new Error("Unrecognised medication.");
  // The medication and pregnancy questions are only answered when the trainer
  // ticks the box saying they asked. Without it the columns stay null, and the
  // gate treats null as unsafe — a saved form must not be able to mean "no"
  // by default on a question nobody put to the client.
  const screeningDone = form.get("medical_screening_done") === "on";
  await must(
    supabase.from("nutrition_profiles").upsert({
      client_id: clientId,
      trainer_id: userId,
      activity_level: pick("activity_level", Object.keys(ACTIVITY_LEVELS)),
      goal: pick("goal", Object.keys(GOALS)),
      diet: pick("diet", DIETS),
      allergens,
      gluten_free: form.get("gluten_free") === "on",
      other_allergy: form.get("other_allergy") === "on",
      severe_allergy: form.get("severe_allergy") === "on",
      life_stage: screeningDone ? pick("life_stage", LIFE_STAGES) : null,
      medications: screeningDone ? medications : null,
      other_medication: screeningDone ? form.get("other_medication") === "on" : null,
    })
  );
  revalidatePath(`/clients/${clientId}/nutrition`);
}

export async function deleteMealPlan(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await must(supabase.from("meal_plans").delete().eq("id", String(form.get("id"))));
  revalidatePath(`/clients/${clientId}/nutrition`);
  redirect(`/clients/${clientId}/nutrition`);
}
