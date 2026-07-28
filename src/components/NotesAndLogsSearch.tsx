"use client";
import { useState } from "react";

interface SearchableLog {
  exerciseName: string;
  date: string;
  detail: string;
}
interface SearchableNote {
  date: string;
  text: string;
}

/**
 * Simple client-side search across a client's notes and logged sets —
 * built as a distinct combined-results utility rather than filtering the
 * always-visible sections below, so "search across notes and logs"
 * genuinely means one search box, one combined result list, both sources.
 * Client-side is the right call here: one client's worth of notes/logs
 * is small, so filtering in the browser is instant with no round trip.
 */
export default function NotesAndLogsSearch({
  notes,
  logs,
}: {
  notes: SearchableNote[];
  logs: SearchableLog[];
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const matchingNotes = q ? notes.filter((n) => n.text.toLowerCase().includes(q)) : [];
  const matchingLogs = q
    ? logs.filter((l) => l.exerciseName.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q))
    : [];

  return (
    <div className="card">
      <h2 className="display text-lg mb-2">Search notes & history</h2>
      <input
        className="input"
        placeholder="e.g. shoulder, sleep, squat…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {q && (
        <div className="mt-3 space-y-3">
          {matchingNotes.length === 0 && matchingLogs.length === 0 && (
            <p className="text-sm text-steel">No matches.</p>
          )}
          {matchingNotes.length > 0 && (
            <div>
              <p className="text-xs text-steel uppercase tracking-wide mb-1">Notes</p>
              <ul className="space-y-1">
                {matchingNotes.map((n, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-steel text-xs">{n.date}</span> — {n.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {matchingLogs.length > 0 && (
            <div>
              <p className="text-xs text-steel uppercase tracking-wide mb-1">Logged sets</p>
              <ul className="space-y-1">
                {matchingLogs.map((l, i) => (
                  <li key={i} className="text-sm">
                    <span className="text-steel text-xs">{l.date}</span> — {l.exerciseName}: {l.detail}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
