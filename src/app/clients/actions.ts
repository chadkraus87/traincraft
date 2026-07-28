"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

async function uid() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  return { supabase, userId: user.id };
}

export async function addClient(form: FormData) {
  const { supabase, userId } = await uid();
  await supabase.from("clients").insert({
    trainer_id: userId,
    full_name: String(form.get("full_name")),
    email: String(form.get("email") || "") || null,
    phone: String(form.get("phone") || "") || null,
    goals: String(form.get("goals") || "") || null,
    training_history: String(form.get("training_history") || "") || null,
    is_remote: form.get("is_remote") === "on",
  });
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
  await supabase
    .from("clients")
    .update({
      full_name: String(form.get("full_name")),
      email: String(form.get("email") || "") || null,
      phone: String(form.get("phone") || "") || null,
      goals: String(form.get("goals") || "") || null,
      training_history: String(form.get("training_history") || "") || null,
      is_remote: form.get("is_remote") === "on",
    })
    .eq("id", clientId);
  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/clients");
}

export async function deleteClient(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("id"));
  await supabase.from("clients").delete().eq("id", clientId);
  revalidatePath("/clients");
  redirect("/clients");
}

export async function addLimitation(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_limitations").insert({
    trainer_id: userId,
    client_id: clientId,
    tag: String(form.get("tag")),
    detail: String(form.get("detail") || "") || null,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/new/${clientId}/limitations`);
}

export async function toggleLimitation(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_limitations")
    .update({ active: form.get("active") === "true" })
    .eq("id", String(form.get("id")));
  revalidatePath(`/clients/${clientId}`);
}

export async function addEquipment(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const weight = String(form.get("weight_lb") || "");
  await supabase.from("client_equipment").insert({
    trainer_id: userId,
    client_id: clientId,
    label: String(form.get("label")),
    equipment_type: String(form.get("equipment_type")),
    quantity: Number(form.get("quantity") || 1),
    weight_lb: weight ? Number(weight) : null,
  });
  revalidatePath(`/clients/${clientId}`);
  revalidatePath(`/clients/new/${clientId}/equipment`);
}

export async function removeEquipment(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_equipment").delete().eq("id", String(form.get("id")));
  revalidatePath(`/clients/${clientId}`);
}

export async function addGoal(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const description = String(form.get("description") || "").trim();
  if (!description) return;
  const targetDate = String(form.get("target_date") || "");
  await supabase.from("client_goals").insert({
    trainer_id: userId,
    client_id: clientId,
    description,
    target_date: targetDate || null,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function toggleGoalComplete(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_goals")
    .update({ completed: form.get("completed") === "true" })
    .eq("id", String(form.get("id")));
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteGoal(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_goals").delete().eq("id", String(form.get("id")));
  revalidatePath(`/clients/${clientId}`);
}

export async function addClientNote(form: FormData) {
  const { supabase, userId } = await uid();
  const clientId = String(form.get("client_id"));
  const note = String(form.get("note") || "").trim();
  if (!note) return;
  await supabase.from("client_notes").insert({
    trainer_id: userId,
    client_id: clientId,
    note,
  });
  revalidatePath(`/clients/${clientId}`);
}

export async function updateClientNote(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const noteId = String(form.get("id"));
  const note = String(form.get("note") || "").trim();
  if (!note) return;
  await supabase.from("client_notes").update({ note }).eq("id", noteId);
  revalidatePath(`/clients/${clientId}`);
}

export async function deleteClientNote(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  const noteId = String(form.get("id"));
  await supabase.from("client_notes").delete().eq("id", noteId);
  revalidatePath(`/clients/${clientId}`);
}
