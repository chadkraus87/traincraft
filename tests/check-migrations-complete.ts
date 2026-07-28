/**
 * Verifies supabase/migrations/ has no numbering gaps — every migration
 * that's ever been applied to the real database should also exist in the
 * repo. This is self-updating: it doesn't hardcode which files should
 * exist, it just checks the numeric sequence is complete from 0001 up to
 * whatever the highest number present is. Catches the exact "applied
 * directly in Supabase's SQL Editor, never actually committed to git" gap
 * that's happened twice already — for any future migration too, with no
 * need to update this check each time a new one gets added.
 */
import { readdirSync } from "fs";

const files = readdirSync("supabase/migrations").filter((f) => /^\d{4}_.+\.sql$/.test(f));
const numbers = files.map((f) => parseInt(f.slice(0, 4), 10)).sort((a, b) => a - b);

if (numbers.length === 0) {
  console.error("FAIL  No migration files found in supabase/migrations/");
  process.exit(1);
}

const highest = numbers[numbers.length - 1];
const missing: number[] = [];
for (let i = 1; i <= highest; i++) {
  if (!numbers.includes(i)) missing.push(i);
}

if (missing.length > 0) {
  const missingStr = missing.map((n) => String(n).padStart(4, "0")).join(", ");
  console.error(
    `FAIL  Migration sequence has gaps — numbers up to ${String(highest).padStart(4, "0")} exist, but these are missing from the repo: ${missingStr}`
  );
  console.error(
    "This usually means a migration was run directly in Supabase's SQL Editor but never committed to git. Find the missing .sql file(s) and add them to supabase/migrations/."
  );
  process.exit(1);
}

console.log(`PASS  Migration sequence complete: 0001 through ${String(highest).padStart(4, "0")}, ${numbers.length} files, no gaps`);
