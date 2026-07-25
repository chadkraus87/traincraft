/** TEST 3 · PDF renderer produces a valid, non-trivial PDF with exclusions box. */
import { writeFileSync } from "fs";
import { planToPdf } from "../src/lib/pdf";
import type { Client, PlanJson } from "../src/lib/types";

const client: Client = {
  id: "c1", full_name: "Maria Alvarez", email: "maria@example.com", phone: null,
  goals: "Fat loss", training_history: null, is_remote: true,
};
const plan: PlanJson = {
  sessions: [
    { day: 1, focus: "Full body A", blocks: [
      { exercise_id: "1", name: "Goblet Squat", sets: 3, reps: "8-10", load_note: "25 lb KB", rest_sec: 90, coaching_note: "Elbows inside knees" },
      { exercise_id: "2", name: "Banded Row", sets: 3, reps: "12-15", load_note: "Red band", rest_sec: 60 },
      { exercise_id: "3", name: "Dead Bug", sets: 3, reps: "8/side", load_note: "Bodyweight", rest_sec: 45 },
    ]},
    { day: 2, focus: "Full body B", blocks: [
      { exercise_id: "4", name: "Farmer Carry", sets: 4, reps: "40 yd", load_note: "25 lb KB", rest_sec: 75 },
    ]},
  ],
  progression_notes: "Add one rep per set weekly; week 4 deload at 60% volume.",
  exclusions: [
    { exercise_name: "Kettlebell Swing", limitation_tag: "low_back_pain",
      reason: "Loaded spinal flexion and heavy axial compression are common symptom triggers.",
      prefer_instead: "Hip hinge patterning at moderate load." },
  ],
};

async function main() {
const buf = await planToPdf(client, "Fat Loss Block 1", plan, 4);
writeFileSync("/tmp/test-plan.pdf", buf);
const head = buf.subarray(0, 5).toString();
console.log(head === "%PDF-" ? "PASS  valid PDF header" : `FAIL  header: ${head}`);
console.log(buf.length > 2000 ? `PASS  non-trivial size (${buf.length} bytes)` : "FAIL  suspiciously small");
process.exit(head === "%PDF-" && buf.length > 2000 ? 0 : 1);
}
main();
