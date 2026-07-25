export interface Client {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  goals: string | null;
  training_history: string | null;
  is_remote: boolean;
}

export interface Limitation {
  id: string;
  client_id: string;
  tag: string;
  detail: string | null;
  active: boolean;
}

export interface EquipmentItem {
  id: string;
  client_id: string;
  label: string;
  equipment_type: string;
  quantity: number;
  weight_lb: number | null;
}

export interface Exercise {
  id: string;
  trainer_id: string | null;
  name: string;
  description: string;
  pattern: string;
  muscle_groups: string[];
  equipment_types: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  cues: string | null;
  contraindication_tags: string[];
  unilateral: boolean;
}

export interface PlanBlock {
  exercise_id: string;
  name: string;
  sets: number;
  reps: string;          // "8-10" or "30s"
  load_note: string;     // "25 lb KB" / "RPE 7"
  rest_sec: number;
  coaching_note?: string;
}

export interface PlanSession {
  day: number;
  focus: string;
  blocks: PlanBlock[];
}

export interface PlanJson {
  sessions: PlanSession[];
  progression_notes: string;
  trainer_notes?: string;
  exclusions: {
    exercise_name: string;
    limitation_tag: string;
    reason: string;
    prefer_instead?: string;
  }[];
}

export interface WorkoutPlan {
  id: string;
  client_id: string;
  title: string;
  workout_type: string;
  weeks: number;
  days_per_week: number;
  status: "draft" | "final";
  plan: PlanJson;
  qa_report: QaReport | null;
  created_at: string;
}

export interface QaCheck {
  name: string;
  pass: boolean;
  detail: string;
  dismissed?: boolean;      // trainer reviewed and dismissed this concern
  addressedNote?: string;   // trainer's note on how it was handled
}

export interface QaReport {
  passed: boolean;
  checks: QaCheck[];
  attempts: number;
  trainerConfirmed?: boolean;
  trainerConfirmedAt?: string;
}
