"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function deletePlan(form: FormData) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const planId = String(form.get("id"));
  const clientId = String(form.get("client_id"));

  // RLS ("own plans" policy) already scopes this to the signed-in trainer;
  // deliveries cascade-delete automatically via the FK in the schema.
  await supabase.from("workout_plans").delete().eq("id", planId);

  revalidatePath(`/clients/${clientId}`);
  revalidatePath("/");
  redirect(`/clients/${clientId}`);
}
