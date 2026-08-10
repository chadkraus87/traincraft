"use client";
import { useState, useTransition } from "react";
import { deleteLimitation } from "@/app/clients/actions";

/**
 * Permanent removal of a mis-logged limitation, behind an inline confirm.
 *
 * Confirmed rather than immediate because this is destructive and adjacent
 * to "Mark resolved" — a mis-click here silently widens what the safety
 * engine will program for this client. Inline rather than window.confirm so
 * the two options can be named for what they actually do.
 */
export default function DeleteLimitationButton({
  limitationId,
  clientId,
  label,
}: {
  limitationId: string;
  clientId: string;
  label: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    const data = new FormData();
    data.set("id", limitationId);
    data.set("client_id", clientId);
    startTransition(async () => {
      await deleteLimitation(data);
    });
  };

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs underline text-steel hover:text-alarm"
        aria-label={`Delete ${label}`}
      >
        Delete
      </button>
    );
  }

  return (
    <span className="flex items-center gap-2 text-xs">
      <span className="text-steel">Delete for good?</span>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="underline text-alarm"
      >
        {pending ? "Deleting…" : "Yes, delete"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="underline text-steel"
      >
        Cancel
      </button>
    </span>
  );
}
