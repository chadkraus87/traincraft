-- Constrain client_limitations.tag to the controlled vocabulary.
--
-- The column was bare `text`. The only thing keeping it valid was a <select>
-- in the browser, which is not validation. A tag with no matching rule in
-- src/lib/safety/rules.ts caused the contraindication filter to skip that
-- limitation entirely — the client received a completely unscreened plan,
-- and the QA re-check, which skipped unknown tags the same way, reported no
-- conflicts. Both safety layers failed together and said nothing.
--
-- Application code now rejects unknown tags and the QA validator flags them,
-- but this is the layer that cannot be bypassed by a hand-posted form, a
-- direct SQL session, or a future code path that forgets to check.
--
-- KEEP IN SYNC with LIMITATION_TAGS in src/lib/safety/rules.ts. Adding a
-- limitation means: add it to that array, add a CONTRAINDICATIONS rule, tag
-- the exercises it should exclude, and add it here — in that order. The
-- coverage-floor test in tests/safety.test.ts will fail if a new tag ships
-- without exercises that it actually excludes.
--
-- NOT VALID would let existing bad rows survive; this is validated on
-- purpose. If it fails to apply, the database already contains a limitation
-- the engine cannot screen for, and that must be corrected rather than
-- grandfathered.

alter table client_limitations
  add constraint client_limitations_tag_vocabulary
  check (tag in (
    'shoulder_impingement',
    'rotator_cuff_injury',
    'low_back_pain',
    'lumbar_disc_injury',
    'knee_pain_patellofemoral',
    'acl_recovery',
    'hip_impingement',
    'wrist_pain',
    'elbow_tendinopathy',
    'ankle_instability',
    'neck_pain',
    'hypertension_uncontrolled',
    'pregnancy_2nd_3rd_trimester',
    'osteoporosis'
  ));
