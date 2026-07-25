import { NextResponse } from "next/server";
import { Resend } from "resend";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: process.env.RESEND_FROM || "TrainCraft <onboarding@resend.dev>",
      to: email,
      subject: "Your TrainCraft account is ready",
      text: "Your TrainCraft account has been created with this email address.\n\nYou can sign in any time at your app's web address.\n\nIf you didn't create this account, you can ignore this email.",
    });
  } catch {
    // Non-fatal: account creation already succeeded regardless of email delivery
  }
  return NextResponse.json({ ok: true });
}
