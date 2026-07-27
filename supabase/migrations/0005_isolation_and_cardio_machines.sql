-- Machine, cable, and isolation exercise batch — fills a real gap in the
-- library (no isolation/machine work existed previously). Written
-- originally under Exercise Science Advisor review, same as every other
-- batch — not sourced or copied from any third-party exercise database.
-- category column already exists at this point (added in 0004), so it's
-- included directly rather than backfilled after the fact.

insert into exercises
  (name, description, pattern, category, muscle_groups, equipment_types, difficulty, cues, contraindication_tags, unilateral)
values

('Leg Press', 'Seated machine press pushing a weighted sled away with the legs.', 'squat', 'Foundational strength', '{quads,glutes}', '{full_gym}', 'beginner', E'Feet shoulder-width on the platform\nDon''t let the knees cave in\nAvoid locking the knees hard at the top', '{}', false),
('Leg Extension (Machine)', 'Seated machine knee extension isolating the quads.', 'squat', 'Foundational strength', '{quads}', '{full_gym}', 'beginner', E'Align the knee with the machine''s pivot point\nControl the weight down, don''t let it drop\nLight squeeze at the top, no need to punch it', '{}', false),
('Leg Curl (Machine)', 'Seated or lying machine knee flexion isolating the hamstrings.', 'hinge', 'Foundational strength', '{hamstrings}', '{full_gym}', 'beginner', E'Full range without yanking\nSqueeze the hamstrings at the top\nControl the return', '{}', false),
('Hack Squat (Machine)', 'Angled machine squat with the back supported.', 'squat', 'Foundational strength', '{quads,glutes}', '{full_gym}', 'intermediate', E'Feet slightly forward on the platform\nControl the descent\nDrive evenly through both feet', '{deep_knee_flexion}', false),
('Lat Pulldown (Cable)', 'Seated cable pulldown to the chest, targeting the lats.', 'pull_vertical', 'Foundational strength', '{back,biceps}', '{cable_machine}', 'beginner', E'Lead with the elbows, not the hands\nPull to the upper chest\nControl the weight back up', '{}', false),
('Seated Cable Row', 'Seated cable row targeting the mid-back.', 'pull_horizontal', 'Foundational strength', '{back,biceps}', '{cable_machine}', 'beginner', E'Sit tall, don''t round forward to reach\nPull to the lower ribs\nSqueeze the shoulder blades together', '{}', false),
('Cable Tricep Pushdown', 'Standing cable press-down isolating the triceps.', 'push_horizontal', 'Foundational strength', '{triceps}', '{cable_machine}', 'beginner', E'Elbows pinned at your sides\nFull extension without locking hard\nControl the weight back up', '{}', false),
('Overhead Tricep Extension (Dumbbell)', 'Standing or seated dumbbell extension behind the head.', 'push_vertical', 'Foundational strength', '{triceps}', '{dumbbell}', 'beginner', E'Elbows stay close to the head\nLower under control, don''t bounce\nFull extension at the top', '{overhead}', false),
('Barbell Bicep Curl', 'Standing barbell curl isolating the biceps.', 'pull_horizontal', 'Foundational strength', '{biceps}', '{barbell}', 'beginner', E'Elbows stay pinned at the sides\nNo swinging the torso for momentum\nControl the weight down', '{}', false),
('Dumbbell Hammer Curl', 'Standing curl with a neutral, palms-facing-in grip.', 'pull_horizontal', 'Foundational strength', '{biceps,forearms}', '{dumbbell}', 'beginner', E'Neutral grip throughout\nElbows stay still\nControl the negative', '{}', false),
('Dumbbell Lateral Raise', 'Standing raise lifting the arms out to the sides.', 'push_vertical', 'Foundational strength', '{shoulders}', '{dumbbell}', 'beginner', E'Lead with the elbows, not the hands\nStop around shoulder height\nLight weight — this one adds up fast', '{}', false),
('Face Pull', 'Cable or band pull to face height, targeting rear delts and upper back.', 'pull_horizontal', 'Foundational strength', '{shoulders,back}', '{cable_machine,band}', 'beginner', E'Pull toward the face, elbows high\nSqueeze the shoulder blades together\nGreat for shoulder health — keep the weight light', '{}', false),
('Standing Calf Raise', 'Rising onto the toes to work the calves.', 'mobility', 'Foundational strength', '{calves}', '{bodyweight}', 'beginner', E'Full range — heels drop below the step if elevated\nPause at the top\nControl the lowering', '{}', false),
('Seated Calf Raise (Machine)', 'Machine calf raise performed seated, emphasizing the soleus.', 'mobility', 'Foundational strength', '{calves}', '{full_gym}', 'beginner', E'Full range of motion each rep\nPause briefly at the top\nControl the descent', '{}', false),
('Preacher Curl', 'Bicep curl performed with the arm braced against an angled pad.', 'pull_horizontal', 'Foundational strength', '{biceps}', '{barbell}', 'intermediate', E'Upper arm stays glued to the pad\nDon''t fully lock the elbow at the bottom\nControl the whole range', '{}', false),
('Skull Crushers', 'Lying barbell or dumbbell tricep extension.', 'push_horizontal', 'Foundational strength', '{triceps}', '{barbell,bench}', 'intermediate', E'Elbows stay stacked over the shoulders\nLower to just above the forehead\nControl matters more than load here', '{supine_extended}', false),
('Cable Woodchop', 'Rotational cable pull from high to low (or low to high) across the body.', 'core_antirotation', 'Foundational strength', '{core,obliques}', '{cable_machine}', 'intermediate', E'Rotate from the trunk, not just the arms\nControl the return, don''t let it whip back\nPivot the back foot naturally', '{loaded_rotation}', true),
('Dumbbell Reverse Fly', 'Bent-over raise targeting the rear deltoids.', 'pull_horizontal', 'Foundational strength', '{shoulders,back}', '{dumbbell}', 'beginner', E'Hinge forward, flat back\nLead with the elbows\nLight weight, focus on the squeeze', '{}', false),
('Barbell Shrug', 'Standing shoulder elevation targeting the traps.', 'carry', 'Foundational strength', '{traps}', '{barbell}', 'beginner', E'Straight up and down, no rolling the shoulders\nPause briefly at the top\nControl the weight down', '{}', false),

-- Cardio machines (make the new equipment types actually usable in plans)
('Treadmill Intervals', 'Alternating work/recovery intervals on a treadmill.', 'conditioning', 'HIIT', '{quads,calves}', '{treadmill}', 'beginner', E'Warm up at an easy pace first\nHold a consistent effort each work interval\nUse the rail only if needed for balance, not to lean on', '{}', false),
('Stationary Bike Intervals', 'Alternating work/recovery intervals on a stationary bike.', 'conditioning', 'HIIT', '{quads,glutes}', '{stationary_bike}', 'beginner', E'Adjust seat height so the knee has a slight bend at full extension\nSteady cadence on recovery, push the effort on work intervals', '{}', false),
('Outdoor Cycling', 'Steady-state or interval cycling outdoors.', 'conditioning', 'HIIT', '{quads,glutes}', '{outdoor_bike}', 'beginner', E'Helmet always\nCheck brakes and tire pressure before heading out\nBuild duration gradually if new to road/trail riding', '{}', false);
