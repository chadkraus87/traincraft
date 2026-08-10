/** TEST 4 · Builder refuses degenerate pools, and never names the client. */
import { buildWorkout, clientBrief } from "../src/lib/ai/builder";
import type { Client, Exercise } from "../src/lib/types";

// ── The client's name must not reach the model ──────────────────────────
// A name reads like helpful context to anyone improving prompt quality, so
// without this assertion the removal silently reverts. Everything else about
// the person is still sent — goals, training history, injuries — so what
// leaves is health data about an unnamed individual rather than a named one.
{
  const named: Client = {
    id: "c1", full_name: "Marguerite Vasquez-Oyelaran", email: "m@example.com",
    phone: "555-0100", goals: "Fat loss", training_history: "Novice", is_remote: true,
  };
  const brief = clientBrief(named);
  const leaks = ["Marguerite", "Vasquez-Oyelaran", "m@example.com", "555-0100"]
    .filter((needle) => brief.includes(needle));

  if (leaks.length > 0) {
    console.log(`FAIL  client identifiers reached the prompt: ${leaks.join(", ")}`);
    process.exit(1);
  }
  console.log("PASS  the client is never named or contactable in the prompt");

  // The brief still has to be useful, or we've removed the wrong thing.
  const informative = brief.includes("Fat loss") && brief.includes("Novice");
  console.log(informative
    ? "PASS  programming context survives the redaction"
    : "FAIL  the brief lost the context the model needs");
  if (!informative) process.exit(1);
}

const client: Client = { id: "c", full_name: "T", email: null, phone: null, goals: null, training_history: null, is_remote: true };
const tinyPool: Exercise[] = [{
  id: "1", trainer_id: null, name: "Push-Up", description: "", pattern: "push_horizontal",
  category: "Foundational strength",
  muscle_groups: ["chest"], equipment_types: ["bodyweight"], difficulty: "beginner",
  cues: null, contraindication_tags: [], unilateral: false,
}];

async function main() {
  try {
    await buildWorkout({ client, limitations: [], equipment: [], pool: tinyPool,
      workoutType: "full_body_strength", weeks: 4, daysPerWeek: 3 });
    console.log("FAIL  should have thrown on 1-exercise pool");
    process.exit(1);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const ok = msg.includes("after safety and equipment filtering");
    console.log(ok ? "PASS  refuses over-filtered pool with actionable error" : `FAIL  wrong error: ${msg}`);
    process.exit(ok ? 0 : 1);
  }
}
main();
