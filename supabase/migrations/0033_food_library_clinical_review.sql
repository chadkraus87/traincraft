-- Corrections from the pre-launch clinical review of the food library.
--
-- 0032 is applied, so these are changes, not edits. Each row below is a
-- correction to a specific safety column, with the reasoning kept next to it
-- so the next person doesn't "fix" it back.

-- Oats and pearled barley were marked contains_gluten on cross-contact
-- grounds, but carried no allergen tag — and the contaminant that justifies
-- the gluten flag IS wheat. The two columns are screened independently:
-- `gluten_free` is the celiac/NCGS switch, `allergens` is the IgE one. So a
-- client with a wheat allergy and no gluten restriction passed both checks
-- and could be served oats. Pure oats and pure barley hold no wheat protein,
-- but neither is reliably free of it unless it says so on the box, and the
-- asymmetry here is anaphylaxis against losing one grain option.
update foods set allergens = '{wheat}' where fdc_id in (173904, 170285);

-- The file's stated convention is that nuts and peanuts carry each other's
-- tags for cross-contact. Almond milk was the one row that didn't follow it.
-- Shelf-stable beverage lines are usually dedicated, so the real risk is low,
-- but an unexplained exception in a safety column is a trap.
update foods set allergens = '{tree_nut,peanut}' where fdc_id = 174832;

-- 40 g of dry chia in one sitting is ~3.5 tbsp. Dry chia swallowed ahead of
-- fluid expands about tenfold and has case reports of esophageal obstruction;
-- the plan PDF prints a bare gram weight with no preparation instruction. One
-- tablespoon is the portion the serving size already describes.
update foods set max_serving_g = 15 where fdc_id = 170554;

-- Canned light tuna at 170 g/meal with no frequency limit can reach ~1190 g
-- per week against the FDA/EPA "best choices" allowance of about 340 g. The
-- per-meal cap is the only lever the schema has today, so it drops to one
-- 4 oz serving. A per-week occurrence cap is the real fix and is not built.
update foods set max_serving_g = 113 where fdc_id = 171986;

-- The one row listed in a form that should not be eaten raw. Salmonella, and
-- at 300 g/meal (~9 whites) chronic avidin-biotin binding. Whole hard-boiled
-- egg stays in the library, so the pool keeps an egg protein source. Retire
-- rather than delete: meal_plans reference food ids, and a plan built against
-- this row must keep failing its live QA check rather than erroring.
update foods set is_active = false where fdc_id = 172183;
