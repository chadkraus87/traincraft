"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { requireUserOrThrow } from "@/lib/auth";

async function uid() {
  const supabase = await supabaseServer();
  // requireUserOrThrow also enforces terms acceptance.
  const user = await requireUserOrThrow();
  return { supabase, userId: user.id };
}

const STATUSES = ["scheduled", "completed", "cancelled", "no_show"] as const;
type Status = (typeof STATUSES)[number];

export async function bookSession(input: {
  clientId: string;
  startsAtIso: string;
  durationMinutes: number;
  timezone: string;
}) {
  const { supabase, userId } = await uid();

  const starts = new Date(input.startsAtIso);
  if (Number.isNaN(starts.getTime())) throw new Error("Choose a valid date and time.");
  const duration = Math.round(input.durationMinutes);
  if (!(duration >= 5 && duration <= 480)) throw new Error("Duration must be between 5 and 480 minutes.");

  const { error } = await supabase.from("training_sessions").insert({
    trainer_id: userId,
    client_id: input.clientId,
    starts_at: starts.toISOString(),
    duration_minutes: duration,
  });
  if (error) throw new Error(error.message);

  // Remember the trainer's zone the first time only, so the server can render
  // times the way the trainer reads them. Never overwritten afterwards: a
  // trainer booking from a hotel shouldn't see their whole home schedule shift
  // by three hours. Validated against the runtime's own list, since this string
  // ends up in Intl calls.
  if (Intl.supportedValuesOf("timeZone").includes(input.timezone)) {
    await supabase
      .from("trainer_profiles")
      .upsert({ trainer_id: userId, timezone: input.timezone }, { onConflict: "trainer_id", ignoreDuplicates: true });
    await supabase
      .from("trainer_profiles")
      .update({ timezone: input.timezone })
      .eq("trainer_id", userId)
      .is("timezone", null);
  }

  revalidatePath("/schedule");
  revalidatePath(`/clients/${input.clientId}`);
}

export async function setSessionStatus(form: FormData) {
  const { supabase } = await uid();
  const status = String(form.get("status")) as Status;
  if (!STATUSES.includes(status)) throw new Error("Unknown session status.");
  const { error } = await supabase
    .from("training_sessions")
    .update({ status })
    .eq("id", String(form.get("id")));
  if (error) throw new Error(error.message);
  revalidatePath("/schedule");
}
