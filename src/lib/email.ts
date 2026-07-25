/**
 * EMAIL · sends directly through the trainer's own Gmail account via SMTP,
 * using a Google "App Password" (not the regular account password).
 * Requires GMAIL_USER and GMAIL_APP_PASSWORD in the environment.
 */
import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return transporter;
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  attachments?: { filename: string; content: Buffer }[];
}) {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error(
      "Email isn't configured yet — GMAIL_USER and GMAIL_APP_PASSWORD are missing from the environment."
    );
  }
  const info = await getTransporter().sendMail({
    from: `TrainCraft <${process.env.GMAIL_USER}>`,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    attachments: opts.attachments,
  });
  return info.messageId;
}
