"use client";
import { useState } from "react";
import { updateClientNote, deleteClientNote } from "@/app/clients/actions";

export default function NoteRow({
  id,
  clientId,
  note,
  createdAt,
}: {
  id: string;
  clientId: string;
  note: string;
  createdAt: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(note);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const form = new FormData();
    form.set("id", id);
    form.set("client_id", clientId);
    form.set("note", text.trim());
    await updateClientNote(form);
    setSaving(false);
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="text-sm border-b border-steel/10 pb-2 last:border-0">
        <span className="text-steel text-xs">{new Date(createdAt).toLocaleDateString()}</span>
        <textarea
          className="input mt-1"
          rows={2}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex gap-2 mt-1">
          <button type="button" className="text-xs text-coral underline" onClick={save} disabled={saving || !text.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" className="text-xs text-steel underline" onClick={() => { setEditing(false); setText(note); }}>
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className="text-sm border-b border-steel/10 pb-2 last:border-0">
      <div className="flex items-start justify-between gap-2">
        <div>
          <span className="text-steel text-xs">{new Date(createdAt).toLocaleDateString()}</span>
          <p>{note}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" className="text-xs text-coral underline" onClick={() => setEditing(true)}>
            Edit
          </button>
          {!confirmingDelete ? (
            <button type="button" className="text-xs text-alarm underline" onClick={() => setConfirmingDelete(true)}>
              Delete
            </button>
          ) : (
            <form action={deleteClientNote} className="flex gap-1.5 items-center">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="client_id" value={clientId} />
              <button type="submit" className="text-xs text-alarm underline">Confirm?</button>
              <button type="button" className="text-xs text-steel underline" onClick={() => setConfirmingDelete(false)}>
                No
              </button>
            </form>
          )}
        </div>
      </div>
    </li>
  );
}
