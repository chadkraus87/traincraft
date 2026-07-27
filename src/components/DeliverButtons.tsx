"use client";
import { useState } from "react";
import { confirmDeliverySent } from "@/app/plans/actions";

/**
 * Plan delivery, redesigned to never send email from a stored server
 * credential. Instead:
 *  - Mobile / share-capable browsers: hands the PDF to the OS share sheet
 *    (Web Share API with a file), so the trainer picks Mail, Gmail, etc.
 *    and it sends from whatever account they're already using on their
 *    own device.
 *  - Desktop fallback (Web Share API for files isn't universally
 *    supported): downloads the PDF and opens the default mail app with
 *    the client's address, subject, and a short message pre-filled.
 *
 * Delivery confirmation is explicitly trainer-attested: after the share
 * sheet or mail app opens, the app has no way to actually know whether the
 * send completed, so it asks the trainer to confirm rather than pretending
 * to auto-detect something it can't see.
 */
export default function DeliverButtons({
  planId,
  planTitle,
  clientName,
  clientEmail,
}: {
  planId: string;
  planTitle: string;
  clientName: string;
  clientEmail: string | null;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const pdfUrl = `/api/plans/${planId}/pdf`;
  const fileName = `${planTitle}.pdf`;

  const emailToClient = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Couldn't load the PDF.");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      const subject = `Your new training plan: ${planTitle}`;
      const body = `Hi ${clientName.split(" ")[0]},\n\nYour new plan "${planTitle}" is attached. Let me know if anything hurts or doesn't feel right.\n\n`;

      const nav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean;
        share?: (data: { files: File[]; title?: string; text?: string }) => Promise<void>;
      };
      const canShareFile = !!nav.canShare && nav.canShare({ files: [file] });

      if (canShareFile && nav.share) {
        await nav.share({ files: [file], title: subject, text: body });
        setStatus("Opened your share sheet.");
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();

        const mailto = `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.location.href = mailto;
        setStatus("PDF downloaded — attach it in the mail window that just opened.");
      }
      setAwaitingConfirm(true);
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus(null); // trainer closed the share sheet — not an error
      } else {
        setStatus(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
    setBusy(false);
  };

  const confirmSent = async () => {
    await confirmDeliverySent(planId, "email", clientEmail ?? "unknown");
    setAwaitingConfirm(false);
    setConfirmed(true);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <a className="btn-ghost" href={pdfUrl}>Download PDF</a>
        <button
          className="btn-ghost"
          onClick={emailToClient}
          disabled={busy}
          title={clientEmail ? "" : "No email on file — you'll need to enter one when your mail app opens"}
        >
          {busy ? "Preparing…" : "Email to client"}
        </button>
        {status && <span className="text-xs text-steel">{status}</span>}
      </div>
      {awaitingConfirm && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-steel">Did that actually send?</span>
          <button type="button" className="text-coral underline" onClick={confirmSent}>
            Yes, mark as sent
          </button>
          <button type="button" className="text-steel underline" onClick={() => setAwaitingConfirm(false)}>
            Not yet
          </button>
        </div>
      )}
      {confirmed && <p className="text-xs text-success">Marked as sent ✓</p>}
    </div>
  );
}
