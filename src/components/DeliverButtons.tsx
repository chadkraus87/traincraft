"use client";
import { useState } from "react";

export default function DeliverButtons({ planId, hasEmail, hasPhone }: { planId: string; hasEmail: boolean; hasPhone: boolean }) {
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const deliver = async (channel: "email" | "sms") => {
    setBusy(true); setStatus(null);
    try {
      const res = await fetch(`/api/plans/${planId}/deliver`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel }),
      });
      const json = await res.json();
      setStatus(res.ok ? `Sent via ${channel}.` : json.error);
    } catch {
      setStatus("Delivery failed.");
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <a className="btn-ghost" href={`/api/plans/${planId}/pdf`}>Download PDF</a>
      <button className="btn-ghost" onClick={() => deliver("email")} disabled={busy || !hasEmail}
        title={hasEmail ? "" : "Client has no email on file"}>Email to client</button>
      <button className="btn-ghost" onClick={() => deliver("sms")} disabled={busy || !hasPhone}
        title={hasPhone ? "" : "Client has no phone on file"}>Text to client</button>
      {status && <span className="text-xs text-steel">{status}</span>}
    </div>
  );
}
