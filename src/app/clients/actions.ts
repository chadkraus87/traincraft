"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { isKnownLimitationTag } from "@/lib/safety/rules";
import type { PlanJson } from "@/lib/types";

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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
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

  const { error } = await supabase.from("client_limitations").insert({
    trainer_id: userId,
    client_id: clientId,
    tag,
    detail: String(form.get("detail") || "") || null,
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
