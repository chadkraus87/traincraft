"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQaReview } from "@/app/plans/actions";
import { QA_CHECK_LABELS } from "@/lib/ai/validate";
import type { QaCheck, QaReport } from "@/lib/types";

export default function QaReportEditor({ planId, initialQa }: { planId: string; initialQa: QaReport }) {
  const router = useRouter();
  const [qa, setQa] = useState<QaReport>(initialQa);
  const [confirmed, setConfirmed] = useState(!!initialQa.trainerConfirmed);
  const [showPassed, setShowPassed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const active = qa.checks.filter((c) => !c.pass && !c.dismissed);
  const passed = qa.checks.filter((c) => c.pass);
  const dismissed = qa.checks.filter((c) => !c.pass && c.dismissed);

  const updateCheck = (name: string, patch: Partial<QaCheck>) => {
    setQa((prev) => ({
      ...prev,
      checks: prev.checks.map((c) => (c.name === name ? { ...c, ...patch } : c)),
    }));
  };

  const save = async () => {
    setSaving(true);
    setSavedMsg(null);
    const updated = { ...qa, trainerConfirmed: confirmed };
    await saveQaReview(planId, updated);
    setQa(updated);
    setSaving(false);
    setSavedMsg("Saved.");
    router.refresh();
    setTimeout(() => setSavedMsg(null), 2500);
  };

  const renderCheck = (c: QaCheck, tone: "fail" | "pass") => (
    <li key={c.name} className="border-b border-steel/10 last:border-0 py-2">
      <div className="flex gap-2 text-sm">
        <span className={tone === "fail" ? "text-alarm shrink-0" : "text-success shrink-0"}>
          {tone === "fail" ? "✗" : "✓"}
        </span>
        <div className="flex-1">
          <span className="font-medium">{QA_CHECK_LABELS[c.name] ?? c.name}</span>
          <span className="text-steel"> — {c.detail}</span>
          <div className="mt-1.5 flex items-start gap-2">
            <input
              type="text"
              value={c.addressedNote ?? ""}
              onChange={(e) => updateCheck(c.name, { addressedNote: e.target.value })}
              placeholder="Add a note (e.g. how you addressed this)"
              className="input text-xs py-1"
            />
            {tone === "fail" && (
              <button
                type="button"
                onClick={() => updateCheck(c.name, { dismissed: true })}
                className="text-xs text-steel underline shrink-0 whitespace-nowrap"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </li>
  );

  return (
    <div className="card border-alarm/40" style={{ borderColor: qa.passed && active.length === 0 ? undefined : undefined }}>
      <div className="flex items-center justify-between mb-1">
        <h2 className="display text-sm">
          {qa.passed && active.length === 0 ? (
            <span className="text-success">QA review</span>
          ) : (
            <span className="text-alarm">Needs your review before sending</span>
          )}
        </h2>
      </div>
      <p className="text-sm text-steel mb-3">
        {active.length === 0
          ? "No open automatic concerns."
          : `${active.length} of ${qa.checks.length} automatic checks didn't pass.`}
        {" "}Add notes, dismiss concerns you've handled another way, and confirm below when you're satisfied it's safe to send.
      </p>

      {active.length > 0 && <ul className="mb-2">{active.map((c) => renderCheck(c, "fail"))}</ul>}

      {dismissed.length > 0 && (
        <div className="mb-2">
          <p className="text-xs text-steel uppercase tracking-wide mb-1">Dismissed</p>
          <ul>
            {dismissed.map((c) => (
              <li key={c.name} className="flex items-center justify-between text-sm text-steel py-1">
                <span>{QA_CHECK_LABELS[c.name] ?? c.name}{c.addressedNote ? ` — ${c.addressedNote}` : ""}</span>
                <button type="button" className="text-xs underline shrink-0" onClick={() => updateCheck(c.name, { dismissed: false })}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="button"
        className="text-xs text-steel underline mb-2"
        onClick={() => setShowPassed((s) => !s)}
      >
        {showPassed ? "Hide" : "Show"} the {passed.length} checks that passed
      </button>
      {showPassed && <ul className="mb-3 pt-2 border-t border-steel/10">{passed.map((c) => renderCheck(c, "pass"))}</ul>}

      <div className="flex items-center gap-3 pt-2 border-t border-steel/10 mt-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} />
          I've reviewed this and confirm it's safe to send
        </label>
        <button type="button" className="btn" onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save review"}
        </button>
        {savedMsg && <span className="text-xs text-success">{savedMsg}</span>}
      </div>
    </div>
  );
}
