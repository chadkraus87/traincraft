"use client";
import { useState } from "react";
import { updateClient, deleteClient } from "@/app/clients/actions";
import type { Client } from "@/lib/types";

export default function ClientEditPanel({ client }: { client: Client }) {
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  if (!editing) {
    return (
      <div className="flex gap-2">
        <button className="btn-ghost" onClick={() => setEditing(true)}>Edit client</button>
        {!confirmingDelete ? (
          <button
            className="btn-ghost border-alarm/40 text-alarm hover:border-alarm hover:text-alarm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete client
          </button>
        ) : (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-alarm">Delete {client.full_name} and all their plans, permanently?</span>
            <form action={deleteClient}>
              <input type="hidden" name="id" value={client.id} />
              <button className="btn-ghost border-alarm text-alarm hover:bg-alarm hover:text-paper">
                Yes, delete
              </button>
            </form>
            <button className="text-steel underline" onClick={() => setConfirmingDelete(false)}>Cancel</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <form
      action={async (form) => {
        await updateClient(form);
        setEditing(false);
      }}
      className="card space-y-3"
    >
      <input type="hidden" name="id" value={client.id} />
      <div><span className="label">Full name</span>
        <input name="full_name" defaultValue={client.full_name} required className="input" /></div>
      <div><span className="label">Email</span>
        <input name="email" type="email" defaultValue={client.email ?? ""} className="input" /></div>
      <div><span className="label">Phone (optional)</span>
        <input name="phone" defaultValue={client.phone ?? ""} className="input" placeholder="(512) 555-0100" /></div>
      <div><span className="label">Goals</span>
        <input name="goals" defaultValue={client.goals ?? ""} className="input" /></div>
      <div><span className="label">Training history / notes</span>
        <textarea name="training_history" defaultValue={client.training_history ?? ""} rows={3} className="input" /></div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_remote" defaultChecked={client.is_remote} /> Remote client (home equipment only)
      </label>
      <div className="flex gap-2">
        <button type="submit" className="btn">Save changes</button>
        <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
      </div>
    </form>
  );
}
