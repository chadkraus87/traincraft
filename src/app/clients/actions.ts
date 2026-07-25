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
}

export async function removeEquipment(form: FormData) {
  const { supabase } = await uid();
  const clientId = String(form.get("client_id"));
  await supabase.from("client_equipment").delete().eq("id", String(form.get("id")));
  revalidatePath(`/clients/${clientId}`);
}
