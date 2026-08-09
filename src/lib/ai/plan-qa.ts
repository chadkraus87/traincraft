/**
 * Re-derives a stored plan's QA report from live client data.
 *
 * Every path that reads or writes a saved plan routes through here, so the
 * verdict always reflects the plan's current contents evaluated against the
 * client as they are *now* — not as they were when the plan was generated.
 * Limitations, equipment, and the exercise pool are re-read on every call.
 *
 * This lives in lib/ rather than in a "use server" actions file because
 * every export of a server-action module becomes a callable endpoint, and
 * this is internal machinery that should not be reachable from a browser.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  filterForLimitations,
  filterForEquipment,
  WORKOUT_TYPES,
} from "@/lib/safety/rules";
import { validatePlan } from "@/lib/ai/validate";
import type { PlanJson, QaReport } from "@/lib/types";

export interface StoredPlanRow {
  client_id: string;
  workout_type: string;
  days_per_week: number;
  is_single_workout?: boolean | null;
}

export async function deriveQaForStoredPlan(
  supabase: SupabaseClient,
  planRow: StoredPlanRow,
  plan: PlanJson,
  attempts = 1
): Promise<QaReport> {
  const [{ data: limitations }, { data: equipment }, { data: pool }] = await Promise.all([
    supabase.from("client_limitations").select("*").eq("client_id", planRow.client_id).eq("active", true),
    supabase.from("client_equipment").select("*").eq("client_id", planRow.client_id),
    supabase.from("exercises").select("*").eq("is_active", true),
  ]);

  const limitationTags = (limitations ?? []).map((l) => l.tag as string);
  const { allowed } = filterForLimitations(pool ?? [], limitationTags);
  const ownedTypes = (equipment ?? []).map((e) => e.equipment_type);
  const { usable } = filterForEquipment(allowed, ownedTypes);

  return validatePlan(
    plan,
    usable,
    limitationTags,
    planRow.workout_type as keyof typeof WORKOUT_TYPES,
    planRow.days_per_week,
    attempts,
    // Omitting this was a live bug: a one-off workout re-validated under the
    // multi-week rules fails progression_defined (which demands the word
    // "deload" and 80+ characters) and silently demotes a good plan to draft.
    !!planRow.is_single_workout
  );
}

/**
 * Whether a plan may be sent to a client.
 *
 * Three things have to line up: the validator's live verdict, the trainer's
 * recorded sign-off, and the absence of any check that has *started* failing
 * since the plan was generated. That last one is the reason this isn't just
 * `status === "final"` — a plan generated clean for a healthy client stays
 * marked final forever, including after the trainer logs an injury that
 * contraindicates half of it.
 */
export function isDeliverable(stored: QaReport | null, live: QaReport): boolean {
  const regressions = live.checks.filter(
    (c) => !c.pass && stored?.checks.find((s) => s.name === c.name)?.pass !== false
  );
  if (regressions.length > 0) return false;
  return live.passed || stored?.trainerConfirmed === true;
}
