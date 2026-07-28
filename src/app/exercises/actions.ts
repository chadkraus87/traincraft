"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function toggleFavorite(exerciseId: string, currentlyFavorited: boolean) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  if (currentlyFavorited) {
    await supabase.from("exercise_favorites").delete().eq("trainer_id", user.id).eq("exercise_id", exerciseId);
  } else {
    await supabase.from("exercise_favorites").insert({ trainer_id: user.id, exercise_id: exerciseId });
  }
  revalidatePath("/exercises");
}

export async function addCustomExercise(form: FormData) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");
  const split = (s: string) => s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean);
  await supabase.from("exercises").insert({
    trainer_id: user.id,
    name: String(form.get("name")),
    description: String(form.get("description")),
    pattern: String(form.get("pattern")),
    category: String(form.get("category") || "Foundational strength"),
    muscle_groups: split(String(form.get("muscle_groups") || "")),
    equipment_types: split(String(form.get("equipment_types") || "bodyweight")),
    difficulty: String(form.get("difficulty")),
    cues: String(form.get("cues") || "") || null,
    contraindication_tags: split(String(form.get("contraindication_tags") || "")),
    unilateral: form.get("unilateral") === "on",
  });
  revalidatePath("/exercises");
}
