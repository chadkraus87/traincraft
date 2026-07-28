"use client";
import { useState } from "react";
import Link from "next/link";

interface PlanSummary {
  id: string;
  title: string;
  status: string;
}

export default function PlanCompareSelector({ plans, clientId }: { plans: PlanSummary[]; clientId: string }) {
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (prev.length >= 2) return [prev[1], id]; // keep it to the most recent 2 picks
      return [...prev, id];
    });
  };

  return (
    <div>
      {plans.length >= 2 && (
        <p className="text-xs text-steel mb-2">Check any two plans to compare them side by side.</p>
      )}
      <ul className="divide-y divide-steel/10">
        {plans.map((p) => (
          <li key={p.id} className="py-2 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              {plans.length >= 2 && (
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggle(p.id)}
                  className="shrink-0"
                />
              )}
              <Link href={`/plans/${p.id}`} className="text-sm hover:text-coral truncate">{p.title}</Link>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${p.status === "final" ? "bg-success/10 text-success" : "bg-signal/20 text-[#F4C77A]"}`}>
              {p.status === "final" ? "QA passed" : "Draft"}
            </span>
          </li>
        ))}
      </ul>
      {selected.length === 2 && (
        <Link
          href={`/plans/compare?a=${selected[0]}&b=${selected[1]}&client=${clientId}`}
          className="btn w-full justify-center mt-3"
        >
          Compare selected plans
        </Link>
      )}
    </div>
  );
}
