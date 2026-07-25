-- Base exercise library · authored under Exercise Science Advisor review.
-- trainer_id NULL = global. Tags must come from the vocab in src/lib/safety/rules.ts.

insert into exercises
  (name, description, pattern, muscle_groups, equipment_types, difficulty, cues, contraindication_tags, unilateral)
values
-- SQUAT ────────────────────────────────────────────────────────────────
('Bodyweight Squat', 'Foundational squat pattern to full comfortable depth.', 'squat', '{quads,glutes}', '{bodyweight}', 'beginner', E'Feet shoulder width\nKnees track over toes\nChest tall, full foot pressure', '{deep_knee_flexion}', false),
('Goblet Squat', 'Squat holding a kettlebell or dumbbell at the chest.', 'squat', '{quads,glutes,core}', '{kettlebell}', 'beginner', E'Elbows inside knees at bottom\nBrace before descending\nStand through mid-foot', '{deep_knee_flexion}', false),
('Box Squat (High Box)', 'Squat to a box set above the painful range; controls depth.', 'squat', '{quads,glutes}', '{box}', 'beginner', E'Sit back, light touch\nNo plopping\nShins near vertical', '{}', false),
('Barbell Back Squat', 'Barbell squat, high-bar position.', 'squat', '{quads,glutes,core}', '{barbell,rack}', 'intermediate', E'Big breath and brace at the top\nControl the descent\nDrive the floor apart', '{deep_knee_flexion,heavy_spinal_load,valsalva_heavy}', false),
('Dumbbell Split Squat', 'Static split-stance squat with dumbbells at sides.', 'lunge', '{quads,glutes}', '{dumbbell}', 'beginner', E'Long stance, torso tall\nBack knee toward floor\nFront foot flat', '{deep_knee_flexion}', true),
('Rear-Foot-Elevated Split Squat', 'Back foot on bench; single-leg emphasis.', 'lunge', '{quads,glutes}', '{dumbbell,bench}', 'intermediate', E'Slight forward lean loads glutes\nControl the bottom\nDrive through front heel', '{deep_knee_flexion,single_leg_unstable}', true),
('Walking Lunge', 'Alternating forward lunges covering ground.', 'lunge', '{quads,glutes}', '{bodyweight}', 'intermediate', E'Step long enough to keep front shin vertical\nSoft touch with back knee', '{deep_knee_flexion,knee_dominant_plyo}', true),
('Step-Up', 'Step onto a box or bench, drive through the top leg.', 'lunge', '{quads,glutes}', '{box}', 'beginner', E'Whole foot on the box\nMinimal push from the floor leg\nControl the way down', '{}', true),

-- HINGE ────────────────────────────────────────────────────────────────
('Romanian Deadlift (Dumbbell)', 'Hip hinge with soft knees, dumbbells sliding down thighs.', 'hinge', '{hamstrings,glutes,back}', '{dumbbell}', 'beginner', E'Push hips back, not down\nFlat back, lats on\nFeel hamstrings, stop there', '{heavy_spinal_load}', false),
('Kettlebell Deadlift', 'Deadlift a kettlebell from the floor between the feet.', 'hinge', '{glutes,hamstrings,back}', '{kettlebell}', 'beginner', E'Wedge hips down and back\nChest proud, arms long\nStand tall, no lean-back', '{heavy_spinal_load}', false),
('Barbell Deadlift', 'Conventional barbell deadlift from the floor.', 'hinge', '{glutes,hamstrings,back}', '{barbell}', 'advanced', E'Bar over mid-foot\nBrace hard, pull slack out\nPush the floor away', '{heavy_spinal_load,valsalva_heavy}', false),
('Kettlebell Swing', 'Ballistic hip hinge; the bell floats to chest height.', 'hinge', '{glutes,hamstrings}', '{kettlebell}', 'intermediate', E'Hike pass to start\nSnap hips, arms are ropes\nStand tall at the top', '{heavy_spinal_load,high_impact}', false),
('Glute Bridge', 'Supine bridge, hips to full extension.', 'hinge', '{glutes,hamstrings}', '{bodyweight}', 'beginner', E'Ribs down, squeeze at top\nDrive through heels\nPause 1s each rep', '{supine_extended,bridging_neck}', false),
('Single-Leg Glute Bridge', 'Bridge on one leg for unilateral hip strength.', 'hinge', '{glutes,hamstrings}', '{bodyweight}', 'intermediate', E'Hips level\nNon-working knee hugged in\nNo low-back arch', '{supine_extended}', true),
('Hip Thrust (Bench)', 'Shoulders on bench, load across hips, drive to full extension.', 'hinge', '{glutes}', '{bench,dumbbell}', 'intermediate', E'Chin tucked, ribs down\nPause at lockout\nShins vertical at top', '{}', false),

-- HORIZONTAL PUSH ──────────────────────────────────────────────────────
('Push-Up', 'Standard push-up with rigid plank line.', 'push_horizontal', '{chest,triceps,shoulders,core}', '{bodyweight}', 'beginner', E'Hands under shoulders\nBody one straight line\nElbows ~45 degrees', '{wrist_extension_load}', false),
('Incline Push-Up', 'Push-up with hands elevated to scale difficulty.', 'push_horizontal', '{chest,triceps,shoulders}', '{bodyweight}', 'beginner', E'Same plank standards as floor push-up\nLower with control', '{wrist_extension_load}', false),
('Dumbbell Bench Press', 'Press dumbbells from the chest lying on a bench.', 'push_horizontal', '{chest,triceps,shoulders}', '{dumbbell,bench}', 'beginner', E'Slight elbow tuck\nFeet planted\nTouch chest level, press to lockout', '{supine_extended}', false),
('Dumbbell Floor Press', 'Bench-press pattern from the floor; shoulder-friendly range.', 'push_horizontal', '{chest,triceps}', '{dumbbell}', 'beginner', E'Upper arm settles to floor each rep\nNeutral grip if shoulders cranky', '{supine_extended}', false),
('Incline Dumbbell Press', 'Press on a 30–45° incline bench.', 'push_horizontal', '{chest,shoulders,triceps}', '{dumbbell,bench}', 'intermediate', E'Wrists stacked over elbows\nControl the stretch, don''t sink', '{}', false),
('Banded Chest Press', 'Standing press against band anchored behind you.', 'push_horizontal', '{chest,triceps,core}', '{band}', 'beginner', E'Split stance for balance\nResist rotation\nFull lockout each rep', '{}', false),

-- VERTICAL PUSH ────────────────────────────────────────────────────────
('Overhead Press (Dumbbell)', 'Standing press to lockout overhead.', 'push_vertical', '{shoulders,triceps,core}', '{dumbbell}', 'intermediate', E'Ribs down, glutes on\nBiceps finish by ears\nDon''t lean back', '{overhead}', false),
('Landmine Press', 'Angled press with barbell in landmine; scapular-plane friendly.', 'push_vertical', '{shoulders,chest,triceps}', '{barbell,landmine}', 'beginner', E'Half-kneeling to start\nPress up and slightly forward\nExhale through the press', '{}', true),
('Pike Push-Up', 'Inverted-V push-up loading shoulders.', 'push_vertical', '{shoulders,triceps}', '{bodyweight}', 'intermediate', E'Hips high, head between arms\nCrown of head toward floor', '{overhead,wrist_extension_load,inverted}', false),

-- HORIZONTAL PULL ──────────────────────────────────────────────────────
('One-Arm Dumbbell Row', 'Row with knee and hand braced on bench.', 'pull_horizontal', '{back,biceps}', '{dumbbell,bench}', 'beginner', E'Flat back, square hips\nPull to hip pocket\nNo torso rotation', '{}', true),
('Bent-Over Kettlebell Row', 'Hinge and row a kettlebell to the ribs.', 'pull_horizontal', '{back,biceps}', '{kettlebell}', 'beginner', E'Hold the hinge\nLead with the elbow\nSqueeze shoulder blade', '{heavy_spinal_load}', true),
('Banded Row', 'Seated or standing row against a band.', 'pull_horizontal', '{back,biceps}', '{band}', 'beginner', E'Tall posture\nPull to lower ribs\nSlow release', '{}', false),
('Inverted Row', 'Body row under a bar or suspension trainer.', 'pull_horizontal', '{back,biceps,core}', '{suspension}', 'intermediate', E'Body rigid like a plank\nPull chest to hands\nAdjust angle for difficulty', '{}', false),
('Chest-Supported Dumbbell Row', 'Row lying prone on an incline bench; spares the low back.', 'pull_horizontal', '{back,biceps}', '{dumbbell,bench}', 'beginner', E'Chest stays glued to pad\nPull elbows back, not up', '{prone}', false),

-- VERTICAL PULL ────────────────────────────────────────────────────────
('Pull-Up', 'Full-range pull-up from a dead hang.', 'pull_vertical', '{back,biceps}', '{pullup_bar}', 'advanced', E'Start from full hang\nChin over bar without kipping\nControl down', '{high_grip_demand,overhead}', false),
('Band-Assisted Pull-Up', 'Pull-up with band assistance under the feet/knee.', 'pull_vertical', '{back,biceps}', '{pullup_bar,band}', 'intermediate', E'Same standards as strict pull-up\nDon''t bounce out of the bottom', '{high_grip_demand,overhead}', false),
('Banded Lat Pulldown', 'Kneeling pulldown with band anchored overhead.', 'pull_vertical', '{back,biceps}', '{band}', 'beginner', E'Tall kneeling, ribs down\nPull elbows to ribs\nFeel the lats, not the arms', '{}', false),

-- CORE ─────────────────────────────────────────────────────────────────
('Front Plank', 'Anti-extension isometric hold.', 'core_antiextension', '{core}', '{bodyweight}', 'beginner', E'Squeeze glutes, tuck ribs\nPush floor away\nBreathe — don''t hold breath', '{prone,max_isometric}', false),
('Dead Bug', 'Supine opposite arm/leg reaches with braced core.', 'core_antiextension', '{core}', '{bodyweight}', 'beginner', E'Low back gently pressed down\nExhale on every reach\nSlow tempo', '{supine_extended}', false),
('Bird Dog', 'Quadruped opposite arm/leg reach; spine-friendly stability.', 'core_antiextension', '{core,back}', '{bodyweight}', 'beginner', E'Imagine a cup of water on your low back\nReach long, not high', '{}', true),
('Pallof Press', 'Anti-rotation press against a band.', 'core_antirotation', '{core}', '{band}', 'beginner', E'Band pulls you sideways — don''t let it\nPress and pause\nBreathe throughout', '{}', true),
('Side Plank', 'Lateral core isometric on forearm.', 'core_antirotation', '{core,obliques}', '{bodyweight}', 'intermediate', E'Straight line ear-to-ankle\nHips tall\nStack or stagger feet', '{max_isometric}', true),
('Hanging Knee Raise', 'Knee raise hanging from a bar.', 'core_flexion', '{core,hip_flexors}', '{pullup_bar}', 'intermediate', E'No swinging\nExhale as knees rise\nControl down', '{loaded_flexion,high_grip_demand,overhead}', false),

-- CARRY / CONDITIONING / MOBILITY ──────────────────────────────────────
('Farmer Carry', 'Walk with heavy implements at sides.', 'carry', '{core,grip,traps}', '{kettlebell}', 'beginner', E'Tall posture, ribs stacked\nShort quick steps\nCrush the handles', '{high_grip_demand}', false),
('Suitcase Carry', 'Single-sided carry; anti-lateral-flexion.', 'carry', '{core,obliques,grip}', '{kettlebell}', 'beginner', E'Stay perfectly level\nDon''t lean away from the load', '{high_grip_demand}', true),
('Sled Push (or Heavy March)', 'Low-skill conditioning drive; march in place with load if no sled.', 'conditioning', '{full_body}', '{bodyweight}', 'beginner', E'Lean into it\nSteady powerful steps\nBreathe rhythmically', '{}', false),
('Burpee', 'Squat thrust to floor, back to standing jump.', 'conditioning', '{full_body}', '{bodyweight}', 'intermediate', E'Chest to floor\nLand soft\nPace for quality', '{high_impact,wrist_extension_load,prone,deep_knee_flexion}', false),
('Jump Squat', 'Explosive squat jump.', 'conditioning', '{quads,glutes}', '{bodyweight}', 'intermediate', E'Land quiet, knees tracking\nReset each rep', '{high_impact,knee_dominant_plyo,deep_knee_flexion}', false),
('Mountain Climber', 'Plank position alternating knee drives.', 'conditioning', '{core,shoulders}', '{bodyweight}', 'beginner', E'Hips stay level with shoulders\nSmooth rhythm', '{wrist_extension_load,high_impact}', false),
('World''s Greatest Stretch', 'Lunge with rotation and hip opener.', 'mobility', '{hips,thoracic}', '{bodyweight}', 'beginner', E'Long lunge, back knee down\nRotate toward front leg\n3 slow breaths per side', '{deep_hip_flexion}', true),
('90/90 Hip Switch', 'Seated internal/external hip rotation transitions.', 'mobility', '{hips}', '{bodyweight}', 'beginner', E'Tall spine\nMove slow through the transition', '{}', false);
