/**
 * POST /api/plans/:id/deliver  body: { channel: "email" | "sms" }
 * Email: sent directly through the trainer's own Gmail account via SMTP
 * (see src/lib/email.ts), with the PDF attached.
 * SMS (Twilio): short summary + note that the full plan was emailed. Requires
 * A2P 10DLC registration in the Twilio console for US numbers.
 * Every attempt is logged to `deliveries` for an audit trail.
 */
import { NextResponse } from "next/server";
import twilio from "twilio";
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

  const { data: plan } = await supabase
    .from("workout_plans").select("*, clients(*)").eq("id", id).single();
  if (!plan) return NextResponse.json({ error: "Plan not found" }, { status: 404 });

  const client = plan.clients;
  const destination = channel === "email" ? client.email : client.phone;
  if (!destination)
    return NextResponse.json(
      { error: `Client has no ${channel === "email" ? "email address" : "phone number"} on file.` },
      { status: 400 }
    );

  const log = async (status: "sent" | "failed", providerId?: string, error?: string) =>
    supabase.from("deliveries").insert({
      trainer_id: user.id, plan_id: id, channel, destination, status,
      provider_id: providerId ?? null, error: error ?? null,
    });

  try {
    if (channel === "email") {
      const pdf = await planToPdf(client, plan.title, plan.plan, plan.weeks);
      const messageId = await sendEmail({
        to: destination,
        subject: `Your new training plan: ${plan.title}`,
        text: emailBody(client.full_name, plan.title, plan.plan),
        attachments: [{ filename: `${plan.title}.pdf`, content: pdf }],
      });
      await log("sent", messageId);
      return NextResponse.json({ ok: true, id: messageId });
    }

    if (channel === "sms") {
      const tw = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      const msg = await tw.messages.create({
        from: process.env.TWILIO_FROM_NUMBER,
        to: destination,
        body: smsBody(client.full_name, plan.title, plan.plan),
      });
      await log("sent", msg.sid);
      return NextResponse.json({ ok: true, id: msg.sid });
    }

    return NextResponse.json({ error: "channel must be 'email' or 'sms'" }, { status: 400 });
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

function smsBody(name: string, title: string, plan: PlanJson) {
  const d1 = plan.sessions[0];
  const preview = d1 ? `Day 1 (${d1.focus}): ${d1.blocks.slice(0, 4).map((b) => b.name).join(", ")}...` : "";
  return `Hi ${name.split(" ")[0]}! Your new plan "${title}" is ready — full PDF is in your email. ${preview}`;
}
