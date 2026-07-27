"use client";
import { useState } from "react";
import { saveAsTemplate } from "@/app/plans/actions";

export default function SaveTemplateButton({ planId }: { planId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    await saveAsTemplate(planId, name.trim());
    setSaving(false);
    setSaved(true);
    setOpen(false);
  };

  if (saved) return <span className="text-xs text-success">Saved as template ✓</span>;

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        Save as template
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <input
        className="input py-1.5 text-sm w-48"
        placeholder="Template name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button type="button" className="btn-ghost" onClick={save} disabled={saving || !name.trim()}>
        {saving ? "Saving…" : "Save"}
      </button>
      <button type="button" className="text-xs text-steel underline" onClick={() => setOpen(false)}>
        Cancel
      </button>
    </div>
  );
}
