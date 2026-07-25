import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: "email required" }, { status: 400 });
  try {
    await sendEmail({
      to: email,
      subject: "Your TrainCraft account is ready",
      text: "Your TrainCraft account has been created with this email address.\n\nYou can sign in any time at your app's web address.\n\nIf you didn't create this account, you can ignore this email.",
    });
  } catch {
    // Non-fatal: account creation already succeeded regardless of email delivery
  }
  return NextResponse.json({ ok: true });
}
