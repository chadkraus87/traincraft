-- Add a category column so the library can be organized by workout style
-- (Foundational strength, CrossFit, Yoga, etc.) instead of a flat list.

alter table exercises add column category text;

-- Default: everything currently uncategorized (the original base library,
-- plus any pre-existing custom exercises) becomes "Foundational strength".
-- The specific UPDATEs below then reclassify the batch added in
-- 0003_expand_exercise_library.sql into their real categories.
update exercises set category = 'Foundational strength' where category is null;

update exercises set category = 'CrossFit'
  where name in (
    'Thruster', 'Wall Ball', 'Kettlebell Snatch', 'Box Jump',
    'Double Unders', 'Toes-to-Bar', 'Pistol Squat', 'Devil Press'
  );

update exercises set category = 'Functional movement'
  where name in (
    'Turkish Get-Up', 'Suitcase Deadlift', 'Bear Crawl',
    'Medicine Ball Rotational Throw', 'Single-Leg Romanian Deadlift',
    'Lateral Lunge', 'Renegade Row', 'Battle Ropes'
  );

update exercises set category = 'Hyrox'
  where name in (
    'Sled Push (Loaded)', 'Sled Pull', 'Ski Erg Intervals',
    'Rowing Erg Intervals', 'Sandbag Carry', 'Sandbag Lunge', 'Burpee Broad Jump'
  );

update exercises set category = 'HIIT'
  where name in ('High Knees', 'Skater Jumps', 'Plank Jacks', 'Tuck Jump', 'Squat Thrust');

update exercises set category = 'Yoga'
  where name in (
    'Downward Dog', 'Child''s Pose', 'Warrior II', 'Chair Pose',
    'Cat-Cow', 'Cobra Pose', 'Pigeon Pose', 'Triangle Pose'
  );

update exercises set category = 'Mat Pilates'
  where name in (
    'The Hundred', 'Pilates Roll-Up', 'Single-Leg Stretch', 'Pilates Plank',
    'Pilates Swimming', 'Side-Lying Leg Series', 'Spine Stretch Forward', 'Pilates Shoulder Bridge'
  );

update exercises set category = 'Senior-specific'
  where name in (
    'Sit-to-Stand', 'Wall Push-Up', 'Seated Band Row', 'Heel-to-Toe Walk',
    'Standing March', 'Seated Leg Extension', 'Standing Balance Reach', 'Seated Chest Press (Band)'
  );
