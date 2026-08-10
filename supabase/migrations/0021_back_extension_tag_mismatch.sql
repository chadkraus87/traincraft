-- Back Extension is not a heavy axial load.
--
-- Every other exercise carrying heavy_spinal_load is a barbell or kettlebell
-- movement that compresses the spine under significant external load:
-- squats, deadlifts, cleans, bent-over rows, good mornings. Back Extension is
-- seeded as `mobility` pattern, bodyweight, and is an extensor endurance
-- movement. It loads the erectors; it does not axially compress the spine.
--
-- That mismatch had a real cost. heavy_spinal_load is avoided by
-- low_back_pain, lumbar_disc_injury and osteoporosis, so this single mistagged
-- row removed spinal extensor work from all three — and for osteoporosis in
-- particular that is backwards. Direction of spinal loading is the variable
-- that matters in that population: flexion-biased exercise is associated with
-- increased vertebral fracture risk, while extensor strengthening is one of
-- the better-supported interventions for reducing it. The ruleset already
-- encodes half of that correctly by avoiding the core_flexion pattern for
-- osteoporosis; excluding extension as well left nothing in either direction.
--
-- The same logic applies to the other two. Extensor endurance work is central
-- to conservative management of non-specific low back pain, and an
-- extension-biased movement is typically well tolerated after disc injury.
-- The rule rationales already point this way — low_back_pain's preferInstead
-- names bird dogs and carries, which is the same posterior-chain endurance
-- idea.
--
-- Removing the tag rather than special-casing per limitation, because the tag
-- was simply wrong about this movement. Genuinely heavy, loaded, end-range
-- hyperextension would warrant its own tag; nothing in the library is that.

update exercises
  set contraindication_tags = array_remove(contraindication_tags, 'heavy_spinal_load')
  where trainer_id is null
    and name = 'Back Extension';
