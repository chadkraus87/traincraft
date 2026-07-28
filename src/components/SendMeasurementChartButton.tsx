"use client";
import { useState } from "react";

/**
 * Sends the blank measurement chart to a client — same share-sheet/mailto
 * pattern as plan delivery (DeliverButtons), no server email credential.
 * Deliberately stays clickable after every send: busy resets to false
 * once the share sheet opens or the download completes, regardless of
 * outcome, so the trainer can send this as many times as they want.
 */
export default function SendMeasurementChartButton({
  clientId,
  clientName,
  clientEmail,
}: {
  clientId: string;
  clientName: string;
  clientEmail: string | null;
}) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pdfUrl = `/api/clients/${clientId}/measurement-chart/pdf`;
  const fileName = `${clientName} - Measurement Chart.pdf`;

  const send = async () => {
    setBusy(true);
    setStatus(null);
    try {
      const res = await fetch(pdfUrl);
      if (!res.ok) throw new Error("Couldn't generate the chart.");
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      const subject = `Body measurement chart — ${clientName}`;
      const body = `Hi ${clientName.split(" ")[0]},\n\nAttached is a quick measurement chart — fill it out (a soft tape measure works best) and send it back whenever you get a chance, either a photo of the sheet or just the numbers in a reply.\n\n`;

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
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") {
        setStatus(null); // trainer closed the share sheet — not an error
      } else {
        setStatus(e instanceof Error ? e.message : "Something went wrong.");
      }
    }
    setBusy(false); // always re-enabled — send this as many times as needed
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn-ghost" onClick={send} disabled={busy}>
        {busy ? "Preparing…" : "Send measurement chart"}
      </button>
      {status && <span className="text-xs text-steel">{status}</span>}
    </div>
  );
}
