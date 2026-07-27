/** TEST 4 · Builder refuses degenerate pools before any API call. */
import { buildWorkout } from "../src/lib/ai/builder";
import type { Client, Exercise } from "../src/lib/types";

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
