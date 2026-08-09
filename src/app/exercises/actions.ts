"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { CONTRAINDICATIONS, EQUIPMENT_TYPES } from "@/lib/safety/rules";

/**
 * The tags that actually do something — derived from the rules rather than
 * listed separately, so removing a tag from a rule can't leave a stale
 * selectable option behind that silently screens nobody.
 */
const KNOWN_CONTRAINDICATION_TAGS = new Set(
  Object.values(CONTRAINDICATIONS).flatMap((r) => r.avoidExerciseTags)
);

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

  // Safety tags were free text. A tag outside the rule vocabulary — a typo,
  // a hyphen instead of an underscore, a plausible-sounding invention like
  // "shoulder" — matches no rule, so the exercise is never excluded for
  // anyone. A trainer adding "Behind-the-Neck Press" and tagging it
  // "behind-neck" would have made it eligible for every impingement client,
  // and no test could see it because tests only read the seed library.
  const contraindicationTags = split(String(form.get("contraindication_tags") || ""));
  const unknownTags = contraindicationTags.filter((t) => !KNOWN_CONTRAINDICATION_TAGS.has(t));
  if (unknownTags.length > 0) {
    throw new Error(
      `Unrecognized safety tag${unknownTags.length > 1 ? "s" : ""}: ${unknownTags.join(", ")}. ` +
        `No screening rule matches ${unknownTags.length > 1 ? "them" : "it"}, so the exercise would never be filtered out for an injured client. ` +
        `Supported tags: ${[...KNOWN_CONTRAINDICATION_TAGS].sort().join(", ")}`
    );
  }

  // Equipment must resolve to something real too: an empty list now means
  // "programmable by nobody" (filterForEquipment fails closed), so silently
  // accepting a blank field would make the exercise vanish from generation
  // with no explanation.
  const equipmentTypes = split(String(form.get("equipment_types") || "bodyweight"));
  const validEquipment = new Set<string>([...EQUIPMENT_TYPES, "bodyweight"]);
  const unknownEquipment = equipmentTypes.filter((t) => !validEquipment.has(t));
  if (equipmentTypes.length === 0) {
    throw new Error(
      `List at least one equipment type, or "bodyweight" if none is needed. An exercise with no equipment listed can never be programmed.`
    );
  }
  if (unknownEquipment.length > 0) {
    throw new Error(
      `Unrecognized equipment: ${unknownEquipment.join(", ")}. Supported: ${[...validEquipment].sort().join(", ")}`
    );
  }

  const { error } = await supabase.from("exercises").insert({
    trainer_id: user.id,
    name: String(form.get("name")),
    description: String(form.get("description")),
    pattern: String(form.get("pattern")),
    category: String(form.get("category") || "Foundational strength"),
    muscle_groups: split(String(form.get("muscle_groups") || "")),
    equipment_types: equipmentTypes,
    difficulty: String(form.get("difficulty")),
    cues: String(form.get("cues") || "") || null,
    contraindication_tags: contraindicationTags,
    unilateral: form.get("unilateral") === "on",
  });
  if (error) throw new Error(error.message);

  revalidatePath("/exercises");
}
