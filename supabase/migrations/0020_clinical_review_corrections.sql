-- Clinical review of migration 0018.
--
-- 0018 closed the tag-coverage gaps but over-applied several tags. This
-- corrects them, and fills in false negatives the review surfaced.
--
-- The governing principle: a tag exclusion means "do not AUTO-PROGRAM this
-- for a client with this limitation." The trainer can always add it by hand.
-- So over-tagging is not a free safety win. It narrows the pool, and when it
-- removes the movements a condition is actually rehabilitated with, it is
-- worse than useless — it encodes the deficit the condition needs corrected.
--
-- Four filters in 0018 emptied a whole modality. Those are the priority:
--   neck_pain      → 0 of 9 bridge variants survived
--   hypertension   → 0 of 9 loaded carries survived
--   pregnancy      → same, and carries are a mainstay of prenatal loading
--   hip_impingement→ every adduction exercise excluded, every abduction one
--                    kept, enforcing exactly the adductor:abductor imbalance
--                    that conservative FAI management exists to fix

-- ═══ REMOVALS ═══════════════════════════════════════════════════════════

-- ── bridging_neck: a supported head is not a loaded neck ────────────────
-- The cervical mechanism in bridging is either end-range cervical flexion
-- bearing load at the cervicothoracic junction, or an unsupported head held
-- against a loaded pelvis. In a floor bridge the occiput rests on the floor
-- and the cervical spine carries the weight of the head and nothing else.
-- Floor bridging is used *in* neck rehab as a non-provocative posterior-chain
-- drill, and excluding it left a neck-pain client with no bridge at all.
--
-- Kept: Hip Thrust (Bench) — head unsupported off the bench edge, holding a
-- chin tuck against a loaded pelvis for the whole set, which is the textbook
-- case. Pilates Shoulder Bridge — the articulated roll-up deliberately loads
-- the cervicothoracic junction in end-range flexion. Ball Bridge variants —
-- head on a moving ball, cervical stabilisers working against an unstable
-- base, with the rotation variant adding cervical torsion.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'bridging_neck')
  where trainer_id is null
    and name in ('Glute Bridge', 'Single-Leg Glute Bridge', 'Marching Floor Bridge', 'TRX Hip Press');

-- ── valsalva_heavy: reserve it for near-maximal efforts ─────────────────
-- The tag protects uncontrolled-hypertension clients from the pressor
-- response to breath-holding under near-maximal load. It should not catch
-- the moderate-load movements you would substitute IN for those clients.
--
--   Farmer / Suitcase Carry — ribcage free, gait rhythmic, breathing
--     unimpeded. Excluding these is what zeroed the carry pattern.
--   Kettlebell / Suitcase Deadlift — capped by the bell, seeded as beginner
--     movements. These are the regressions a coach reaches for precisely
--     BECAUSE they don't demand a Valsalva.
--   Sled Drag / Sled Pull — concentric-only, no eccentric, no bar to brace
--     against. Sled work is a staple for hypertensive clients for this reason.
--
-- Kept: Sled Push (Loaded) and Sled Sprint (maximal by name and practice);
-- Bear-Hug, Rack, Front-Rack and Overhead Carry (all mechanically restrict
-- the ribcage or hold load overhead — genuinely breath-limiting, and this
-- still leaves four carries available).
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'valsalva_heavy')
  where trainer_id is null
    and name in (
      'Farmer Carry', 'Suitcase Carry',
      'Kettlebell Deadlift', 'Suitcase Deadlift',
      'Sled Drag', 'Sled Pull'
    );

-- ── max_isometric: yoga holds are not maximal isometrics ────────────────
-- The acute pressor response to an isometric scales with %MVC, proximity to
-- failure, and muscle mass — not with the fact of being held still. A wall
-- sit is bilateral, near quad MVC, and conventionally programmed to failure.
-- Warrior I/II and Chair Pose are submaximal postural holds for a prescribed
-- number of breaths, and yoga actively coaches continuous breathing — the
-- Valsalva pathway that makes isometrics risky here is largely absent.
--
-- These were also the only three Yoga-category strength poses in the library,
-- so tagging them meant a hypertensive client booked for yoga got stretches.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'max_isometric')
  where trainer_id is null
    and name in ('Warrior I', 'Warrior II', 'Chair Pose');

-- ── deep_hip_flexion: adductor work involves no hip flexion ─────────────
-- The FAI provocation is deep flexion, especially with adduction and
-- internal rotation — the FADIR position. Isolated adduction is performed at
-- roughly 0 degrees of hip flexion. There is no flexion component at all.
--
-- The clinical half of the argument matters more than the biomechanical one:
-- adductor weakness and a low adduction:abduction strength ratio are
-- modifiable risk factors in FAI and athletic groin pain, and adductor
-- loading is a core part of conservative management. Before this change the
-- filter gave a FAI client five abduction exercises and zero adduction ones.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'deep_hip_flexion')
  where trainer_id is null
    and name in (
      'Standing Hip Adduction',
      'Side-Lying Hip Adduction',
      'Cable Hip Adduction',
      'Hip Adduction Machine',
      'Active Adductor Stretch',
      'Static: Standing Adductor Stretch'
    );

-- ── high_grip_demand: stop excluding the rehab, and the light curls ─────
-- Wrist Curl and Wrist Extension are a wrist-only ROM with a light dumbbell
-- in a relaxed grip — whatever they are, they are not high grip demand. More
-- importantly, loaded wrist extension is the best-supported loading
-- intervention for lateral epicondylalgia and wrist flexion is its analogue
-- for medial. The limitation tag doesn't distinguish the two, so between them
-- these are the first-line protocol for whichever the client has. The rule's
-- own preferInstead already says "tempo work at moderate load, isometrics" —
-- which is what these are. Dosage belongs in a plan note, not an exclusion.
--
-- The supported, light curls come off too: elbow flexion under a low grip
-- torque is not the mechanism of either epicondylalgia.
--
-- Kept: Barbell Bicep Curl and Preacher Curl (fixed supinated bar loading the
-- flexor-pronator origin), Reverse Curl (pronated loading of the common
-- extensor origin — the most provocative curl for tennis elbow), Dumbbell
-- Hammer Curl (brachioradialis originates on the lateral supracondylar ridge).
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'high_grip_demand')
  where trainer_id is null
    and name in (
      'Wrist Curl', 'Wrist Extension',
      'Concentration Curl', 'Incline Biceps Curl',
      'Seated Biceps Curl (Machine)', 'Single-Leg Dumbbell Curl', 'TRX Biceps Curl'
    );

-- ── deep_shoulder_flexion: a fly is not shoulder flexion ────────────────
-- A fly is horizontal ab/adduction at roughly 90 degrees of elevation. The
-- humerus never travels through the 60-120 degree painful arc, so it does not
-- narrow the subacromial space. If flys are to be excluded for impingement
-- the mechanism is end-range horizontal abduction stressing the anterior
-- capsule — a different structure needing a different tag.
--
-- Dumbbell Lateral Raise and Upright Row stay excluded. Both are abduction
-- rather than flexion, and Upright Row adds internal rotation which makes it
-- the most reliable impingement provoker in the library. The tag name
-- understates them; the exclusion is right. See the follow-up note below.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'deep_shoulder_flexion')
  where trainer_id is null
    and name in ('Dumbbell Fly', 'Stability-Ball Dumbbell Fly', 'Two-Arm Standing Cable Fly');

-- ── neck_load: the front rack does not load the neck ────────────────────
-- In a front squat the bar rests on the anterior deltoids and clavicle, not
-- the cervical spine, and there is no axial load through the neck. The real
-- demand is thoracic extension and shoulder/wrist mobility. Sustained
-- shoulder-girdle elevation is already covered by front_rack, which this row
-- carries — so removing neck_load changes nothing for wrist_pain clients and
-- stops describing a front squat to the trainer as neck loading.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'neck_load')
  where trainer_id is null
    and name in ('Front Squat (Barbell)');

-- ── wide_stance_squat: keep the tag's meaning literal ───────────────────
-- Neither seated stretch is a squat. The exclusion is defensible on FABER
-- grounds and is preserved via deep_hip_flexion; filing them under a tag
-- named for a squat pattern is how tag drift starts.
update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'wide_stance_squat')
  where trainer_id is null
    and name in ('Seated Side-Straddle Stretch', 'Static: Butterfly Stretch');

-- ═══ ADDITIONS — false negatives the review surfaced ════════════════════

-- ── valsalva_heavy ──────────────────────────────────────────────────────
-- Heavy hip thrusting is a well-documented BP spike: braced trunk, short
-- range, near-maximal load. Nordic curls and glute-ham raises are maximal
-- eccentrics performed with a held breath. All three survived the
-- hypertension filter entirely.
update exercises
  set contraindication_tags = contraindication_tags || '{valsalva_heavy}'
  where trainer_id is null
    and not ('valsalva_heavy' = any(contraindication_tags))
    and name in ('Hip Thrust (Bench)', 'Nordic Hamstring Curl', 'Glute-Ham Raise');

-- ── max_isometric + prone: the plank the family forgot ──────────────────
-- Prone Iso-Ab is a plank — the name says "iso" — and was the only member of
-- the family carrying neither tag.
update exercises
  set contraindication_tags = contraindication_tags || '{max_isometric}'
  where trainer_id is null
    and not ('max_isometric' = any(contraindication_tags))
    and name in ('Prone Iso-Ab');

-- ── inverted: head-below-heart positions ────────────────────────────────
-- Decline Chest Press carried no tags at all, so it passed every hypertension
-- and pregnancy filter despite being a head-below-heart loaded press.
update exercises
  set contraindication_tags = contraindication_tags || '{inverted}'
  where trainer_id is null
    and not ('inverted' = any(contraindication_tags))
    and name in ('Decline Chest Press', 'Inverted Push-Up', 'Decline Push-Up');

-- ── supine_extended: the presses and stretches 0018 missed ──────────────
-- Pregnancy (2nd/3rd trimester): extended supine positions can compress the
-- inferior vena cava. 0018 tagged the barbell bench family and left several
-- direct siblings untagged — the same within-family inconsistency it was
-- written to fix. Lying stretches were missed entirely: Active Hamstring
-- Stretch carried the tag while the identical Lying Straight-Leg Hamstring
-- Stretch did not.
--
-- Incline variants remain deliberately untagged: an inclined torso is the
-- standard prenatal modification, so excluding it removes the substitute
-- rather than the risk.
update exercises
  set contraindication_tags = contraindication_tags || '{supine_extended}'
  where trainer_id is null
    and not ('supine_extended' = any(contraindication_tags))
    and name in (
      'Ball Dumbbell Chest Press',
      'Two-Arm Dumbbell Chest Press with Band',
      'Single-Arm Dumbbell Chest Press',
      'Decline Chest Press',
      'Lying Straight-Leg Hamstring Stretch',
      'Lying Hip-Flexor Stretch',
      'Lying Piriformis Stretch',
      'Lying Abduction Stretch',
      'Supine Spinal Twist'
    );

-- ── prone: front-support and face-down positions that were missed ───────
-- Note the deliberate boundary, because it looks inconsistent otherwise:
-- planks are excluded for pregnancy and push-ups are not. The mechanism here
-- is sustained intra-abdominal pressure and coning risk with diastasis, which
-- is a function of how long the front-support position is held. A plank is a
-- hold; a push-up is a brief dynamic rep, and knee or incline push-ups are a
-- standard prenatal modification. Tagging the whole push-up family would also
-- risk emptying push_horizontal for a bodyweight-only prenatal client.
update exercises
  set contraindication_tags = contraindication_tags || '{prone}'
  where trainer_id is null
    and not ('prone' = any(contraindication_tags))
    and name in (
      'Prone Iso-Ab',
      'Lateral Bear Crawl',
      'Renegade Row',
      'Burpee Broad Jump',
      'Devil Press',
      'Inchworms',
      'TRX Atomic Push-Up'
    );

-- ── neck_load: unsupported bent-over rows ───────────────────────────────
-- Sustained cervical extension against gravity for a whole set is one of the
-- most commonly reported gym aggravators for neck pain, and the rule's own
-- preferInstead specifies "supported rows, chest-supported work." The
-- unsupported bent-over rows were passing.
update exercises
  set contraindication_tags = contraindication_tags || '{neck_load}'
  where trainer_id is null
    and not ('neck_load' = any(contraindication_tags))
    and name in ('Bent-Over Barbell Row', 'Bent-Over Dumbbell Row', 'Bent-Over Kettlebell Row');

-- ── high_grip_demand: the heavy and ballistic pulling that defines it ───
-- With no "use straps" modifier in the data model, exclusion is the only way
-- to express the rule's own preferInstead: "straps for pulls." These are the
-- movements where sustained or ballistic maximal grip IS the exercise, and
-- they were missed while light supported curls were tagged.
update exercises
  set contraindication_tags = contraindication_tags || '{high_grip_demand}'
  where trainer_id is null
    and not ('high_grip_demand' = any(contraindication_tags))
    and name in (
      'Romanian Deadlift (Barbell)', 'Romanian Deadlift (Dumbbell)',
      'Barbell Shrug',
      'Barbell High Pull', 'Kettlebell High Pull',
      'Barbell Power Clean', 'Clean and Jerk', 'Power Snatch',
      'Kettlebell Snatch', 'Single-Arm Dumbbell Snatch', 'Kettlebell Clean',
      'Bent-Over Dumbbell Row', 'Bent-Over Kettlebell Row', 'One-Arm Dumbbell Row',
      'TRX Low Row', 'TRX Mid Row', 'TRX Single-Arm Row', 'Inverted Row'
    );

-- ── deep_hip_flexion: the hanging/supine hip-flexor cluster ─────────────
-- The largest false-negative group for FAI. hip_impingement does not ban the
-- core_flexion pattern, so these were auto-programmed freely: repeated
-- end-range hip flexion with the hip flexors driving the femoral head
-- anteriorly. Mechanically worse than several of the squats 0018 did tag.
--
-- The figure-four positions are flexion with adduction — essentially FADIR,
-- and a very common anterior-pinch reproducer.
update exercises
  set contraindication_tags = contraindication_tags || '{deep_hip_flexion}'
  where trainer_id is null
    and not ('deep_hip_flexion' = any(contraindication_tags))
    and name in (
      'Captain''s Chair', 'Hanging Leg Raise', 'Hanging Knee Raise',
      'Reverse Crunch', 'V-Up', 'Medicine-Ball V-Up',
      'Lying Piriformis Stretch', 'Standing Figure-Four Stretch',
      'Hip Closers', 'Walking Knee Hug'
    );

-- ── loaded_flexion: rowing erg ──────────────────────────────────────────
-- Osteoporosis and lumbar disc injury both avoid loaded_flexion. Rowing
-- repeats a loaded flexed-spine catch position for hundreds of strokes, which
-- is the vertebral-compression mechanism the osteoporosis rationale names.
-- Ski Erg is left alone: the trunk flexes but load is carried overhead
-- through the arms rather than driving spinal compression.
update exercises
  set contraindication_tags = contraindication_tags || '{loaded_flexion}'
  where trainer_id is null
    and not ('loaded_flexion' = any(contraindication_tags))
    and name in ('Rowing Erg Intervals');

-- ═══ DEFERRED — deliberately not decided here ══════════════════════════
--
-- Judgment calls that depend on the individual client and belong with a
-- clinician, not in a filter:
--   · Hip Adduction Machine and 90/90 Hip Switch for FAI — depend on
--     morphology (cam vs pincer).
--   · Rowing catch depth and bike saddle height for FAI — these are setup
--     variables, not properties of the exercise. Coach them, don't filter.
--   · Cable Diagonal Raise for impingement — provocative loaded to full
--     elevation, therapeutic in partial range.
--   · Isometric holds for *controlled* hypertension — current evidence
--     favours them as a BP-lowering intervention. This ruleset's tag is
--     scoped to "uncontrolled", which is the right scope.
--
-- Structural follow-ups, tracked but not done here because they are renames
-- rather than clinical decisions:
--   · Split `prone` into lying-prone vs front-support, so a future limitation
--     that only cares about lying face-down doesn't inherit the plank ban.
--   · `deep_shoulder_flexion` also carries abduction-through-the-painful-arc
--     movements (lateral raise, upright row). A name like
--     painful_arc_elevation would describe what it actually gates.
--   · Back Extension carries heavy_spinal_load and is therefore excluded for
--     osteoporosis. Progressive spinal *extensor* strengthening is one of the
--     better-supported interventions for reducing vertebral fracture risk.
--     This predates 0018 and deserves its own review.
