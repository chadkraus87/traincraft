"use client";
import { useState } from "react";
import { QA_CHECK_LABELS } from "@/lib/ai/validate";
import type { QaReport } from "@/lib/types";

export default function QaReportCard({ qa }: { qa: QaReport }) {
  const [showPassed, setShowPassed] = useState(false);
  const failed = qa.checks.filter((c) => !c.pass);
  const passed = qa.checks.filter((c) => c.pass);

  if (qa.passed) {
    return (
      <div className="border-l-4 border-success bg-success/10 text-success px-4 py-3 rounded-r-md text-sm">
        This plan passed every automatic safety check.
      </div>
    );
  }

  return (
    <div className="card border-alarm/40">
      <h2 className="display text-sm text-alarm mb-1">Needs your review before sending</h2>
      <p className="text-sm text-steel mb-3">
        {failed.length} of {qa.checks.length} automatic checks didn't pass. Nothing was sent to the client — review below, then regenerate or send anyway if you're confident it's fine.
      </p>
      <ul className="space-y-2 mb-3">
        {failed.map((c) => (
          <li key={c.name} className="flex gap-2 text-sm">
            <span className="text-alarm shrink-0">✗</span>
            <span>
              <span className="font-medium">{QA_CHECK_LABELS[c.name] ?? c.name}</span>
              <span className="text-steel"> — {c.detail}</span>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="text-xs text-steel underline"
        onClick={() => setShowPassed((s) => !s)}
      >
        {showPassed ? "Hide" : "Show"} the {passed.length} checks that did pass
      </button>
      {showPassed && (
        <ul className="space-y-2 mt-3 pt-3 border-t border-steel/10">
          {passed.map((c) => (
            <li key={c.name} className="flex gap-2 text-sm text-steel">
              <span className="text-success shrink-0">✓</span>
              <span>
                <span className="font-medium">{QA_CHECK_LABELS[c.name] ?? c.name}</span>
                <span> — {c.detail}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
