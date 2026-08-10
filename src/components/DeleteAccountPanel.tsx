"use client";
import { useState, useTransition } from "react";
import { deleteOwnAccount } from "@/app/settings/actions";

/**
 * Account deletion, gated behind typing the word rather than a click.
 *
 * This removes every client record, plan, note and logged session in one
 * irreversible step — including data about people who aren't the person
 * clicking. A confirm dialog is too easy to dismiss by reflex for something
 * with no undo and no backup a trainer can reach.
 */
export default function DeleteAccountPanel({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmed = typed.trim().toUpperCase() === "DELETE";

  const run = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteOwnAccount();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      // Full reload rather than a router push: the session is gone, and any
      // cached React state referencing it is now meaningless.
      window.location.href = "/login";
    });
  };

  return (
    <div className="card mt-6 border-l-4 border-alarm">
      <h2 className="display text-lg mb-1">Delete your account</h2>
      <p className="text-sm text-steel mb-3">
        Permanently deletes your account and everything in it — every client, their injuries and
        equipment, all plans, notes, goals and logged sessions. This cannot be undone, and we
        cannot recover it for you afterwards.
      </p>

      {!open ? (
        <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
          Delete my account
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm">
            You are about to delete the account for <span className="text-ink">{email}</span>. Type{" "}
            <span className="font-mono text-alarm">DELETE</span> to confirm.
          </p>
          <input
            className="input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="DELETE"
            aria-label="Type DELETE to confirm"
            autoComplete="off"
          />
          {error && <p className="text-sm text-alarm">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={!confirmed || pending}
              className="btn"
              style={{ background: confirmed ? "#B3402F" : undefined, borderColor: confirmed ? "#B3402F" : undefined }}
            >
              {pending ? "Deleting…" : "Permanently delete everything"}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => { setOpen(false); setTyped(""); setError(null); }}
              disabled={pending}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
