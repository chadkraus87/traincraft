/**
 * Data-driven muscle diagram — one component, works for all 400+
 * exercises (and any future custom ones) automatically, since it's
 * driven entirely by each exercise's existing muscle_groups field. No
 * per-exercise artwork needed.
 *
 * Region design note: the 21 distinct muscle_groups values actually used
 * across the library were audited directly from the database before
 * building this. A few very-low-frequency, visually-adjacent values are
 * intentionally merged into one drawn region for legibility at this
 * scale (e.g. traps/lats/thoracic — 3, 3, and 1 occurrences respectively
 * — all merge into "back", since drawing three near-identical slivers of
 * upper-back at this size wouldn't actually be readable). This trades a
 * small amount of anatomical precision for something a trainer can
 * actually parse at a glance, which is the point of an instructional
 * diagram.
 */

const MUTED = "#8B8577";
const HOT = "#EC6B3A";

// Maps every real muscle_groups value in the data to one drawn region.
const REGION_MATCHES: Record<string, string[]> = {
  neck: ["neck"],
  shoulders: ["shoulders"],
  chest: ["chest"],
  biceps: ["biceps"],
  forearms: ["forearms", "grip"],
  triceps: ["triceps"],
  core: ["core"],
  obliques: ["obliques"],
  hipFront: ["hip_flexors", "adductors"],
  quads: ["quads"],
  back: ["back", "lats", "traps", "thoracic"],
  glutes: ["glutes", "hips"],
  hamstrings: ["hamstrings"],
  calves: ["calves"],
};

function isHit(region: string, muscleGroups: string[]) {
  if (muscleGroups.includes("full_body")) return true;
  const matches = REGION_MATCHES[region] ?? [];
  return matches.some((m) => muscleGroups.includes(m));
}

function fillFor(region: string, muscleGroups: string[]) {
  return isHit(region, muscleGroups) ? HOT : "none";
}

export default function MuscleDiagram({ muscleGroups }: { muscleGroups: string[] }) {
  const mg = muscleGroups.map((m) => m.toLowerCase());

  return (
    <svg width="220" height="150" viewBox="0 0 260 150" role="img" aria-label={`Muscles targeted: ${muscleGroups.join(", ")}`}>
      {/* FRONT */}
      <g transform="translate(10,5)">
        <circle cx="70" cy="12" r="9" fill="none" stroke={MUTED} strokeWidth="1" />
        <rect x="66" y="20" width="8" height="6" fill={fillFor("neck", mg)} stroke={MUTED} strokeWidth="1" />
        <circle cx="52" cy="31" r="7" fill={fillFor("shoulders", mg)} stroke={MUTED} strokeWidth="1" />
        <circle cx="88" cy="31" r="7" fill={fillFor("shoulders", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="57" y="26" width="26" height="21" rx="6" fill={fillFor("chest", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="49" y="26" width="6" height="35" rx="3" fill={fillFor("biceps", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="85" y="26" width="6" height="35" rx="3" fill={fillFor("biceps", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="47" y="61" width="7" height="24" rx="3.5" fill={fillFor("forearms", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="86" y="61" width="7" height="24" rx="3.5" fill={fillFor("forearms", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="60" y="47" width="6" height="20" rx="2" fill={fillFor("obliques", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="74" y="47" width="6" height="20" rx="2" fill={fillFor("obliques", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="63" y="47" width="14" height="20" rx="4" fill={fillFor("core", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="58" y="67" width="24" height="12" rx="4" fill={fillFor("hipFront", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="57" y="79" width="10" height="30" rx="4" fill={fillFor("quads", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="73" y="79" width="10" height="30" rx="4" fill={fillFor("quads", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="58" y="109" width="8" height="24" rx="3" fill="none" stroke={MUTED} strokeWidth="1" />
        <rect x="74" y="109" width="8" height="24" rx="3" fill="none" stroke={MUTED} strokeWidth="1" />
        <text x="70" y="145" textAnchor="middle" fontSize="9" fill={MUTED}>Front</text>
      </g>

      {/* BACK */}
      <g transform="translate(150,5)">
        <circle cx="70" cy="12" r="9" fill="none" stroke={MUTED} strokeWidth="1" />
        <rect x="66" y="20" width="8" height="6" fill="none" stroke={MUTED} strokeWidth="1" />
        <circle cx="52" cy="31" r="7" fill={fillFor("shoulders", mg)} stroke={MUTED} strokeWidth="1" />
        <circle cx="88" cy="31" r="7" fill={fillFor("shoulders", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="57" y="26" width="26" height="41" rx="6" fill={fillFor("back", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="49" y="26" width="6" height="35" rx="3" fill={fillFor("triceps", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="85" y="26" width="6" height="35" rx="3" fill={fillFor("triceps", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="47" y="61" width="7" height="24" rx="3.5" fill="none" stroke={MUTED} strokeWidth="1" />
        <rect x="86" y="61" width="7" height="24" rx="3.5" fill="none" stroke={MUTED} strokeWidth="1" />
        <rect x="58" y="67" width="24" height="12" rx="4" fill={fillFor("glutes", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="57" y="79" width="10" height="30" rx="4" fill={fillFor("hamstrings", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="73" y="79" width="10" height="30" rx="4" fill={fillFor("hamstrings", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="58" y="109" width="8" height="24" rx="3" fill={fillFor("calves", mg)} stroke={MUTED} strokeWidth="1" />
        <rect x="74" y="109" width="8" height="24" rx="3" fill={fillFor("calves", mg)} stroke={MUTED} strokeWidth="1" />
        <text x="70" y="145" textAnchor="middle" fontSize="9" fill={MUTED}>Back</text>
      </g>
    </svg>
  );
}
