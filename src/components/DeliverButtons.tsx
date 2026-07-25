"use client";
import { useState } from "react";

export default function DeliverButtons({ planId, hasEmail }: { planId: string; hasEmail: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const deliver = async () => {
    setBusy(true); setStatus(null);
    try {
      const res = await fetch(`/api/plans/${planId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email" }),
      });
      const json = await res.json();
      setStatus(res.ok ? "Sent via email." : json.error);
    } catch {
      setStatus("Delivery failed.");
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a className="btn-ghost" href={`/api/plans/${planId}/pdf`}>Download PDF</a>
      <button className="btn-ghost" onClick={deliver} disabled={busy || !hasEmail}
        title={hasEmail ? "" : "Client has no email on file"}>Email to client</button>
      {status && <span className="text-xs text-steel">{status}</span>}
    </div>
  );
}
