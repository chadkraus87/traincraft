-- Close the contraindication tag-coverage gaps.
--
-- The rules in src/lib/safety/rules.ts read as comprehensive. The seed data
-- did not back them. Measured against all 543 seeded exercises, several
-- limitations excluded almost nothing:
--
--     hip_impingement            2 of 543   (0.4%)
--     hypertension_uncontrolled  5 of 543   (0.9%)
--     elbow_tendinopathy         9 of 543   (1.7%)
--
-- Seven rule tags matched zero exercises and were therefore inert — the rule
-- existed, read like protection, and excluded nothing:
--   behind_neck, deep_shoulder_flexion, wide_grip_press, kipping,
--   wide_stance_squat, elbow_extension_overload, neck_load
--
-- The cause was per-row tagging rather than per-movement-family tagging, which
-- produced siblings that disagree: Front Plank carried max_isometric while
-- Decline Plank carried nothing; Glute Bridge carried bridging_neck while
-- every other bridge variant did not; Barbell Back Squat carried
-- valsalva_heavy while every barbell bench press variant carried nothing.
--
-- CLINICAL REVIEW REQUIRED. These assignments are conservative programming
-- heuristics derived from the rationale strings already in rules.ts. They are
-- not a clinician's judgment and have not been reviewed by one. A qualified
-- exercise professional should audit this migration before it reaches real
-- clients. Exclusion here only means "do not auto-program"; a trainer can
-- still add any exercise by hand.
--
-- Tags are appended, never replaced, and each statement is idempotent — it
-- skips rows that already carry the tag — so re-running is safe.
-- Scoped to trainer_id is null so a trainer's own custom exercises are
-- never silently rewritten.

update exercises
  set contraindication_tags = contraindication_tags || '{valsalva_heavy}'
  where trainer_id is null
    and not ('valsalva_heavy' = any(contraindication_tags))
    and name in (
    'Barbell Bench Press',
    'Barbell Bench Press with Bands',
    'Barbell Bench Press with Chains',
    'Barbell Decline Press',
    'Incline Barbell Bench Press',
    'Close-Grip Bench Press',
    'Front Squat (Barbell)',
    'Sumo Deadlift',
    'Trap-Bar Deadlift',
    'Romanian Deadlift (Barbell)',
    'Kettlebell Deadlift',
    'Suitcase Deadlift',
    'Barbell Power Clean',
    'Clean and Jerk',
    'Power Snatch',
    'Push Press',
    'Split Jerk',
    'Thruster',
    'Good Mornings',
    'Bent-Over Barbell Row',
    'Barbell Overhead Press',
    'Barbell High Pull',
    'Barbell Shrug',
    'Jump Shrug',
    'Leg Press',
    'Hack Squat (Machine)',
    'Farmer Carry',
    'Suitcase Carry',
    'Sandbag Carry',
    'Rack Carry',
    'Front-Rack Carry',
    'Overhead Carry',
    'Bear-Hug Carry',
    'Sled Push (Loaded)',
    'Sled Sprint',
    'Sled Drag',
    'Sled Pull'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{max_isometric}'
  where trainer_id is null
    and not ('max_isometric' = any(contraindication_tags))
    and name in (
    'Wall Sit',
    'Decline Plank',
    'Front Plank with Hip Extension',
    'Plank with Alternating Arm and Leg Lift',
    'Plank with Arm Lift',
    'Plank with Leg Lift',
    'Straight-Arm Plank',
    'TRX Plank',
    'Pilates Plank',
    'Side Plank with Bent Knee',
    'Side Plank with Hip Abduction',
    'Side Plank with Rotation',
    'Side Plank Row',
    'Hollow-Body Hold',
    'Chair Pose',
    'Warrior I',
    'Warrior II'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{inverted}'
  where trainer_id is null
    and not ('inverted' = any(contraindication_tags))
    and name in (
    'Downward Dog',
    'Stability-Ball Pikes'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{bridging_neck}'
  where trainer_id is null
    and not ('bridging_neck' = any(contraindication_tags))
    and name in (
    'Ball Bridge',
    'Ball Bridge with Hip Rotation',
    'Ball Bridge with Leg Curl',
    'Hip Thrust (Bench)',
    'Marching Floor Bridge',
    'Pilates Shoulder Bridge',
    'Single-Leg Glute Bridge',
    'TRX Hip Press'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{neck_load}'
  where trainer_id is null
    and not ('neck_load' = any(contraindication_tags))
    and name in (
    'Barbell Shrug',
    'Jump Shrug',
    'Barbell Back Squat',
    'Front Squat (Barbell)',
    'Upright Row'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{supine_extended}'
  where trainer_id is null
    and not ('supine_extended' = any(contraindication_tags))
    and name in (
    'Barbell Bench Press',
    'Barbell Bench Press with Bands',
    'Barbell Bench Press with Chains',
    'Barbell Decline Press',
    'Close-Grip Bench Press',
    'Dumbbell Fly',
    'Stability-Ball Dumbbell Fly'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{prone}'
  where trainer_id is null
    and not ('prone' = any(contraindication_tags))
    and name in (
    'Decline Plank',
    'Front Plank with Hip Extension',
    'Plank with Alternating Arm and Leg Lift',
    'Plank with Arm Lift',
    'Plank with Leg Lift',
    'Straight-Arm Plank',
    'TRX Plank',
    'Pilates Plank',
    'Plank Walkup',
    'Plank Jacks',
    'Plank-to-Push-Up'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{elbow_extension_overload}'
  where trainer_id is null
    and not ('elbow_extension_overload' = any(contraindication_tags))
    and name in (
    'Skull Crushers',
    'Cable Tricep Pushdown',
    'Overhead Tricep Extension (Dumbbell)',
    'Triceps Kickback',
    'TRX Triceps Press',
    'Partner Triceps Extension',
    'Close-Grip Bench Press',
    'Bench Dips',
    'Seated Close-Grip Chest Press'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{high_grip_demand}'
  where trainer_id is null
    and not ('high_grip_demand' = any(contraindication_tags))
    and name in (
    'Barbell Bicep Curl',
    'Preacher Curl',
    'Concentration Curl',
    'Dumbbell Biceps Curl',
    'Dumbbell Hammer Curl',
    'Incline Biceps Curl',
    'TRX Biceps Curl',
    'Single-Leg Dumbbell Curl',
    'Seated Biceps Curl (Machine)',
    'Reverse Curl',
    'Wrist Curl',
    'Wrist Extension',
    'Battle Ropes',
    'Battle-Rope Alternating Wave',
    'Rope Slams',
    'Bent-Over Barbell Row',
    'Barbell Deadlift',
    'Trap-Bar Deadlift',
    'Sumo Deadlift',
    'Kettlebell Swing'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{deep_shoulder_flexion}'
  where trainer_id is null
    and not ('deep_shoulder_flexion' = any(contraindication_tags))
    and name in (
    'Dumbbell Lateral Raise',
    'Dumbbell Front Raise',
    'Barbell Front Raise',
    'Dumbbell Fly',
    'Stability-Ball Dumbbell Fly',
    'Two-Arm Standing Cable Fly',
    'TRX Y Fly',
    'Upright Row'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{deep_hip_flexion}'
  where trainer_id is null
    and not ('deep_hip_flexion' = any(contraindication_tags))
    and name in (
    'Barbell Back Squat',
    'Bodyweight Squat',
    'Ball Squat',
    'Cable Squat',
    'Goblet Squat',
    'Front Squat (Barbell)',
    'Dumbbell Front Squat',
    'Kettlebell Front Squat',
    'Hack Squat (Machine)',
    'Prisoner Squat',
    'TRX Squat',
    'Pistol Squat',
    'Partner-Assisted Bodyweight Squat',
    'Plie Squat',
    'Kettlebell Sumo Squat',
    'Leg Press',
    'Thruster',
    'Dumbbell Thruster',
    'Wall Ball',
    'Squat to Row',
    'Squat to Curl to Press',
    'Medicine-Ball Squat and Press',
    'Medicine-Ball Squat Throw',
    'Kettlebell Crush Curl with Squat',
    'Curtsy Lunge',
    'Drop Lunge',
    'Lateral Lunge',
    'Lateral Lunge with Reach',
    'Lateral Lunge Wood Chop',
    'Lateral Lunge to Balance',
    'Walking Knee Hug to Lunge',
    'Walking Spiderman',
    'Spiderman with Rotation',
    'Transverse Lunge to Balance',
    'Seated Side-Straddle Stretch',
    'Static: Butterfly Stretch',
    'Active Adductor Stretch',
    'Static: Standing Adductor Stretch',
    'Hip Adduction Machine',
    'Cable Hip Adduction',
    'Side-Lying Hip Adduction',
    'Standing Hip Adduction'
  );

update exercises
  set contraindication_tags = contraindication_tags || '{wide_stance_squat}'
  where trainer_id is null
    and not ('wide_stance_squat' = any(contraindication_tags))
    and name in (
    'Kettlebell Sumo Squat',
    'Plie Squat',
    'Sumo Deadlift',
    'Seated Side-Straddle Stretch',
    'Static: Butterfly Stretch'
  );

