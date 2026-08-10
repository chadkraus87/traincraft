/** TEST 3 · PDF renderer produces a valid, non-trivial PDF with exclusions box. */
import { writeFileSync } from "fs";
import { planToPdf, measurementChartToFillablePdf } from "../src/lib/pdf";
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
const buf = await planToPdf(client, "Fat Loss Block 1", plan, 4, {
  businessName: "Alvarez Strength",
  coachName: "Dana Alvarez",
  credentials: "CPT | PES",
  phone: "(512) 555-0142",
  isDefault: false,
});
writeFileSync("/tmp/test-plan.pdf", buf);
const head = buf.subarray(0, 5).toString();
console.log(head === "%PDF-" ? "PASS  valid PDF header" : `FAIL  header: ${head}`);
console.log(buf.length > 2000 ? `PASS  non-trivial size (${buf.length} bytes)` : "FAIL  suspiciously small");

// The measurement chart is no longer laid out in code — it fills a shipped
// AcroForm asset. That makes two new things breakable that the type system
// can't catch: the asset going missing, and the 'client_name' field being
// renamed by a future design refresh. The renderer deliberately degrades to
// an unfilled chart rather than throwing, so a smoke test alone would pass
// silently; this asserts the name actually landed in the saved document.
const chart = await measurementChartToFillablePdf("Jordan Alvarez");
const chartHead = Buffer.from(chart.subarray(0, 5)).toString();
const chartOk = chartHead === "%PDF-";
console.log(chartOk ? "PASS  measurement chart is a valid PDF" : `FAIL  chart header: ${chartHead}`);

const { PDFDocument } = await import("pdf-lib");
const reloaded = await PDFDocument.load(chart);
const form = reloaded.getForm();
const fieldCount = form.getFields().length;
const filledName = form.getTextField("client_name").getText();

const nameOk = filledName === "Jordan Alvarez";
console.log(nameOk
  ? "PASS  chart pre-fills the client name"
  : `FAIL  client_name is ${JSON.stringify(filledName)} — template field renamed or missing?`);

// Pre-filling must not flatten the form; the client still has to type into it.
const stillFillable = fieldCount >= 20;
console.log(stillFillable
  ? `PASS  chart stays fillable (${fieldCount} form fields)`
  : `FAIL  only ${fieldCount} fields left — was the form flattened?`);

const allPass = head === "%PDF-" && buf.length > 2000 && chartOk && nameOk && stillFillable;
process.exit(allPass ? 0 : 1);
}
main();
