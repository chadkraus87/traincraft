/**
 * POST /api/plans/:id/deliver  body: { channel: "email" }
 * Email: sent directly through the trainer's own Gmail account via SMTP
 * (see src/lib/email.ts), with the PDF attached.
 * Every attempt is logged to `deliveries` for an audit trail.
 *
 * SMS delivery was removed to avoid the ongoing cost of a Twilio phone
 * number. To bring it back later: restore the Twilio branch from git
 * history (see the "Remove SMS delivery option" commit), add the
 * TWILIO_* env vars, and restore the "Text to client" button in
 * src/components/DeliverButtons.tsx.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { planToPdf } from "@/lib/pdf";
import { sendEmail } from "@/lib/email";
import type { PlanJson } from "@/lib/types";

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { channel } = await req.json();
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  if (channel !== "email")
    return NextResponse.json({ error: "channel must be 'email'" }, { status: 400 });

  const { data: plan } = await supabase
    .from("workout_plans").select("*, clients(*)").eq("id", id).single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const client = plan.clients;
  const destination = client.email;
  if (!destination)
    return NextResponse.json({ error: "Client has no email address on file." }, { status: 400 });

  const log = async (status: "sent" | "failed", providerId?: string, error?: string) =>
    supabase.from("deliveries").insert({
      trainer_id: user.id, plan_id: id, channel, destination, status,
      provider_id: providerId ?? null, error: error ?? null,
    });

  try {
    const pdf = await planToPdf(client, plan.title, plan.plan, plan.weeks);
    const messageId = await sendEmail({
      to: destination,
      subject: `Your new training plan: ${plan.title}`,
      text: emailBody(client.full_name, plan.title, plan.plan),
      attachments: [{ filename: `${plan.title}.pdf`, content: pdf }],
    });
    await log("sent", messageId);
    return NextResponse.json({ ok: true, id: messageId });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Delivery failed";
    await log("failed", undefined, msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

function emailBody(name: string, title: string, plan: PlanJson) {
  const days = plan.sessions
    .map((s) => `Day ${s.day} — ${s.focus}: ${s.blocks.map((b) => b.name).join(", ")}`)
    .join("\n");
  return `Hi ${name.split(" ")[0]},

Your new plan "${title}" is attached as a PDF. Quick preview:

${days}

Progression: ${plan.progression_notes}

Questions or anything hurts? Reply here and let me know.`;
}
