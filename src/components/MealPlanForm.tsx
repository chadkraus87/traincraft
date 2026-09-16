"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MealPlanForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [days, setDays] = useState("3");
  const [meals, setMeals] = useState("4");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const res = await fetch("/api/meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, days: Number(days), mealsPerDay: Number(meals) }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.id) throw new Error(json.error ?? `Generation failed (${res.status})`);
      router.push(`/clients/${clientId}/nutrition/${json.id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Generation failed");
      setBusy(false);
    }
  };

  return (
    <div className="card space-y-3">
      <h2 className="display text-lg">Generate a meal plan</h2>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="label">Days</span>
          <select value={days} onChange={(e) => setDays(e.target.value)} className="input">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Meals per day</span>
          <select value={meals} onChange={(e) => setMeals(e.target.value)} className="input">
            {[2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}
          </select>
        </label>
      </div>
      <button type="button" onClick={generate} disabled={busy} className="btn w-full justify-center">
        {busy ? "Building and checking…" : "Generate"}
      </button>
      {err && <p role="alert" className="text-sm text-alarm">{err}</p>}
    </div>
  );
}
