/** TEST · Pre-participation screening gate. Fails closed; plain assertions. */
import { clearanceNeed, programmingGate, type ScreeningRow } from "../src/lib/intake/screening";

let failures = 0;
function check(name: string, cond: boolean, detail = "") {
  console.log(`${cond ? "PASS " : "FAIL "} ${name}${cond || !detail ? "" : " — " + detail}`);
  if (!cond) failures++;
}

const TODAY = new Date("2026-09-16T12:00:00Z");
const healthy: ScreeningRow = {
  screened_on: "2026-09-01",
  currently_active: true,
  known_cardiovascular_disease: false,
  known_metabolic_disease: false,
  known_renal_disease: false,
  has_symptoms: false,
  eating_disorder_history: false,
  consent_data_storage: true,
  waiver_signed: true,
  clearance_obtained_on: null,
};
const s = (over: Partial<ScreeningRow>): ScreeningRow => ({ ...healthy, ...over });

check("no screening blocks programming", !programmingGate(null, TODAY).allowed);
check("a healthy, consented, waivered client is cleared", programmingGate(healthy, TODAY).allowed);

check("symptoms require clearance before exercise", clearanceNeed(s({ has_symptoms: true })) === "required_before_exercise");
check("symptoms block even an active client", !programmingGate(s({ has_symptoms: true }), TODAY).allowed);
check("symptoms + recent clearance is cleared",
  programmingGate(s({ has_symptoms: true, clearance_obtained_on: "2026-09-10" }), TODAY).allowed);

for (const k of ["known_cardiovascular_disease", "known_metabolic_disease", "known_renal_disease"] as const) {
  check(`${k} without clearance blocks`, !programmingGate(s({ [k]: true }), TODAY).allowed);
}
check("known disease with clearance is cleared",
  programmingGate(s({ known_metabolic_disease: true, clearance_obtained_on: "2026-08-01" }), TODAY).allowed);
check("clearance older than 12 months no longer counts",
  !programmingGate(s({ known_metabolic_disease: true, clearance_obtained_on: "2025-08-01" }), TODAY).allowed);

check("a screening over a year old blocks", !programmingGate(s({ screened_on: "2025-09-01" }), TODAY).allowed);
check("missing waiver blocks", !programmingGate(s({ waiver_signed: false }), TODAY).allowed);
check("missing storage consent blocks", !programmingGate(s({ consent_data_storage: false }), TODAY).allowed);
check("blocked gates explain themselves", programmingGate(null, TODAY).reasons.length > 0);

// Found by review: each of these passed the gate before the fix.
check("a clearance dated in the future does not count",
  !programmingGate(s({ has_symptoms: true, clearance_obtained_on: "2062-09-10" }), TODAY).allowed);
check("a clearance from before the screening doesn't cover newly reported symptoms",
  !programmingGate(s({ has_symptoms: true, screened_on: "2026-09-15", clearance_obtained_on: "2026-09-01" }), TODAY).allowed);
check("an unparseable screening date blocks instead of never expiring",
  !programmingGate(s({ screened_on: "infinity" }), TODAY).allowed);
check("a screening dated in the future blocks",
  !programmingGate(s({ screened_on: "2027-01-01" }), TODAY).allowed);

console.log(failures === 0 ? "\nALL INTAKE TESTS PASSED" : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
