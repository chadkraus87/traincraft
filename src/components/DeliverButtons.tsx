"use client";
import { useState } from "react";
import { confirmDeliverySent } from "@/app/plans/actions";

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

  const downloadAndMailto = (blob: Blob, subject: string, body: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();

    const mailto = `mailto:${clientEmail ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
    setStatus("PDF downloaded — attach it in the mail window that just opened.");
    setAwaitingConfirm(true);
  };

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

      let shared = false;
      if (canShareFile && nav.share) {
        try {
          await nav.share({ files: [file], title: subject, text: body });
          setStatus("Opened your share sheet.");
          setAwaitingConfirm(true);
          shared = true;
        } catch (shareErr) {
          if (shareErr instanceof Error && shareErr.name === "AbortError") {
            setStatus(null);
            shared = true;
          }
        }
      }

      if (!shared) downloadAndMailto(blob, subject, body);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Something went wrong.");
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
