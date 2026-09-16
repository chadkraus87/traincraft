import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Per-trainer generation quota, shared by workout and meal-plan generation.
 * Enforced against generation_events rather than process memory, because
 * serverless instances are recycled and requests fan out — a module-level
 * counter would reset constantly and enforce nothing.
 */
export const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

export async function overGenerationLimit(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from("generation_events")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", userId)
    .gte("created_at", new Date(Date.now() - RATE_WINDOW_MS).toISOString());
  // A quota we can't read is a quota we can't enforce.
  return !!error || (count ?? 0) >= RATE_LIMIT;
}

export const RATE_LIMIT_MESSAGE = `You've generated ${RATE_LIMIT} plans in the last hour, which is the current limit. Try again shortly — this cap is here so one busy account can't slow generation down for everyone.`;
