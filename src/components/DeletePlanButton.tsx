"use client";
import { useState } from "react";
import { deletePlan } from "@/app/plans/actions";

export default function DeletePlanButton({
  planId,
  clientId,
  planTitle,
}: {
  planId: string;
  clientId: string;
  planTitle: string;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        className="btn-ghost border-alarm/40 text-alarm hover:border-alarm hover:text-alarm"
        onClick={() => setConfirming(true)}
      >
        Delete plan
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-alarm">Delete &ldquo;{planTitle}&rdquo; permanently?</span>
      <form action={deletePlan}>
        <input type="hidden" name="id" value={planId} />
        <input type="hidden" name="client_id" value={clientId} />
        <button className="btn-ghost border-alarm text-alarm hover:bg-alarm hover:text-paper">
          Yes, delete
        </button>
      </form>
      <button className="text-steel underline" onClick={() => setConfirming(false)}>
        Cancel
      </button>
    </div>
  );
}
