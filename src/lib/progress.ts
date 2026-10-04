/**
 * Field definitions for measurements and check-ins, shared by the form, the
 * server action and the charts so the three can't disagree about what a
 * field is called or what range it accepts. Ranges mirror the CHECK
 * constraints in migration 0029.
 */
export const MEASUREMENT_FIELDS = [
  { key: "weight_lb", label: "Weight", unit: "lb", group: "Body composition", min: 40, max: 1000 },
  { key: "body_fat_pct", label: "Body fat", unit: "%", group: "Body composition", min: 2, max: 75 },
  { key: "resting_hr", label: "Resting heart rate", unit: "bpm", group: "Body composition", min: 25, max: 220 },
  { key: "neck_in", label: "Neck", unit: "in", group: "Circumference", min: 5, max: 40 },
  { key: "upper_arm_in", label: "Mid upper arm", unit: "in", group: "Circumference", min: 5, max: 40 },
  { key: "chest_in", label: "Chest / bust", unit: "in", group: "Circumference", min: 15, max: 90 },
  { key: "waist_in", label: "Waist", unit: "in", group: "Circumference", min: 15, max: 90 },
  { key: "hip_in", label: "Hip", unit: "in", group: "Circumference", min: 15, max: 90 },
  { key: "thigh_in", label: "Mid-thigh", unit: "in", group: "Circumference", min: 8, max: 60 },
  { key: "sf_biceps_mm", label: "Biceps", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_triceps_mm", label: "Triceps", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_chest_mm", label: "Chest", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_subscapular_mm", label: "Subscapular", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_abdomen_mm", label: "Abdomen", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_iliac_crest_mm", label: "Iliac crest", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_thigh_mm", label: "Thigh", unit: "mm", group: "Skinfold", min: 1, max: 90 },
  { key: "sf_calf_mm", label: "Calf", unit: "mm", group: "Skinfold", min: 1, max: 90 },
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]["key"];

export const CHECKIN_FIELDS = [
  { key: "energy", label: "Energy", low: "Drained", high: "Great" },
  { key: "sleep_quality", label: "Sleep", low: "Poor", high: "Great" },
  { key: "soreness", label: "Soreness", low: "None", high: "Very sore" },
  { key: "stress", label: "Stress", low: "Calm", high: "Very high" },
  { key: "adherence", label: "Plan adherence", low: "Off plan", high: "Fully on plan" },
] as const;

/** Body mass index from pounds and inches. Display only — never a gate. */
export function bmi(weightLb: number | null, heightIn: number | null): number | null {
  if (!weightLb || !heightIn) return null;
  return Math.round(((703 * weightLb) / (heightIn * heightIn)) * 10) / 10;
}
