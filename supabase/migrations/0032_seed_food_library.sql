-- Seed the food library from USDA FoodData Central, SR Legacy (April 2018
-- release). SR Legacy is public domain. Nutrient values per 100 g are copied
-- verbatim from the dataset — none are estimated — and fdc_id links each row
-- to its source record.
--
-- The selection is deliberately whole and minimally processed foods. Allergen
-- content of a single-ingredient food is unambiguous; that of a branded,
-- multi-ingredient product varies by manufacturer, so bread, hummus, tortillas
-- and similar were left out rather than tagged by guesswork.
--
-- Allergen tags lean conservative where cross-contact is common in
-- processing: nuts and peanuts carry each other's tags, oats are marked as
-- containing gluten, and pasta carries egg. For allergens, over-tagging costs
-- a food option; under-tagging can cause anaphylaxis. That asymmetry is the
-- opposite of the exercise library, where over-tagging removed rehab work.
--
-- Serving sizes and per-meal maxima are editorial, not USDA values: they
-- bound what the plan builder may portion so a scaled plan can't prescribe
-- 900 g of chicken in a sitting.
--
-- CLINICAL REVIEW: allergen tags and portion bounds have not been reviewed by
-- a registered dietitian. Meal plans also carry an explicit label-check
-- warning, because cross-contact varies by brand and no library can see it.

insert into foods (fdc_id, name, usda_description, category, animal_class, serving_g, serving_desc,
  max_serving_g, allergens, contains_gluten, kcal, protein_g, fat_g, carbs_g, fiber_g, sodium_mg)
values
  (171477, 'Chicken breast, roasted', 'Chicken, broilers or fryers, breast, meat only, cooked, roasted', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 165.0, 31.02, 3.57, 0.0, 0.0, 74.0),
  (172388, 'Chicken thigh, roasted', 'Chicken, broilers or fryers, thigh, meat only, cooked, roasted', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 179.0, 24.76, 8.15, 0.0, 0.0, 106.0),
  (172851, 'Ground turkey, 93% lean, cooked', 'Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 213.0, 27.1, 11.6, 0.0, 0.0, 90.0),
  (174755, 'Ground beef, 93% lean, cooked', 'Beef, ground, 93% lean meat / 7% fat, crumbles, cooked, pan-browned', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 209.0, 28.88, 9.51, 0.0, 0.0, 86.0),
  (168634, 'Top sirloin steak, lean, broiled', 'Beef, top sirloin, steak, separable lean only, trimmed to 0" fat, all grades, cooked, broiled', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 183.0, 30.55, 5.79, 0.0, 0.0, 64.0),
  (168250, 'Pork tenderloin, roasted', 'Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted', 'protein', 'meat', 120, '4 oz cooked', 250, '{}', false, 143.0, 26.17, 3.51, 0.0, 0.0, 57.0),
  (175168, 'Salmon, Atlantic, cooked', 'Fish, salmon, Atlantic, farmed, cooked, dry heat', 'protein', 'fish', 120, '4 oz cooked', 250, '{fish}', false, 206.0, 22.1, 12.35, 0.0, 0.0, 61.0),
  (171956, 'Cod, cooked', 'Fish, cod, Atlantic, cooked, dry heat', 'protein', 'fish', 120, '4 oz cooked', 250, '{fish}', false, 105.0, 22.83, 0.86, 0.0, 0.0, 78.0),
  (175177, 'Tilapia, cooked', 'Fish, tilapia, cooked, dry heat', 'protein', 'fish', 120, '4 oz cooked', 250, '{fish}', false, 128.0, 26.15, 2.65, 0.0, 0.0, 56.0),
  (171986, 'Tuna, light, canned in water, drained', 'Fish, tuna, light, canned in water, without salt, drained solids', 'protein', 'fish', 85, '1 small can, drained', 170, '{fish}', false, 116.0, 25.51, 0.82, 0.0, 0.0, 50.0),
  (175180, 'Shrimp, cooked', 'Crustaceans, shrimp, cooked', 'protein', 'shellfish', 100, '3.5 oz cooked', 220, '{shellfish}', false, 99.0, 23.98, 0.28, 0.2, null, 111.0),
  (173424, 'Egg, hard-boiled', 'Egg, whole, cooked, hard-boiled', 'protein', 'animal_product', 50, '1 large egg', 200, '{egg}', false, 155.0, 12.58, 10.61, 1.12, 0.0, 124.0),
  (172183, 'Egg whites', 'Egg, white, raw, fresh', 'protein', 'animal_product', 100, 'about 3 large whites', 300, '{egg}', false, 52.0, 10.9, 0.17, 0.73, 0.0, 166.0),
  (172475, 'Tofu, firm', 'Tofu, raw, firm, prepared with calcium sulfate', 'protein', 'plant', 100, '3.5 oz', 250, '{soy}', false, 144.0, 17.27, 8.72, 2.78, 2.3, 14.0),
  (174272, 'Tempeh', 'Tempeh', 'protein', 'plant', 85, '3 oz', 200, '{soy}', false, 192.0, 20.29, 10.8, 7.64, null, 9.0),
  (168411, 'Edamame, shelled', 'Edamame, frozen, prepared', 'protein', 'plant', 80, '1/2 cup', 200, '{soy}', false, 121.0, 11.91, 5.2, 8.91, 5.2, 6.0),
  (172421, 'Lentils, cooked', 'Lentils, mature seeds, cooked, boiled, without salt', 'legume', 'plant', 130, '2/3 cup', 300, '{}', false, 116.0, 9.02, 0.38, 20.13, 7.9, 2.0),
  (173757, 'Chickpeas, cooked', 'Chickpeas (garbanzo beans, bengal gram), mature seeds, cooked, boiled, without salt', 'legume', 'plant', 130, '2/3 cup', 300, '{}', false, 164.0, 8.86, 2.59, 27.42, 7.6, 7.0),
  (173735, 'Black beans, cooked', 'Beans, black, mature seeds, cooked, boiled, without salt', 'legume', 'plant', 130, '2/3 cup', 300, '{}', false, 132.0, 8.86, 0.54, 23.71, 8.7, 1.0),
  (173740, 'Kidney beans, cooked', 'Beans, kidney, all types, mature seeds, cooked, boiled, without salt', 'legume', 'plant', 130, '2/3 cup', 300, '{}', false, 127.0, 8.67, 0.5, 22.8, 6.4, 1.0),
  (170894, 'Greek yogurt, plain, nonfat', 'Yogurt, Greek, plain, nonfat (Includes foods for USDA''s Food Distribution Program)', 'dairy', 'animal_product', 170, '3/4 cup', 400, '{milk}', false, 59.0, 10.19, 0.39, 3.6, 0.0, 36.0),
  (172182, 'Cottage cheese, 2%', 'Cheese, cottage, lowfat, 2% milkfat', 'dairy', 'animal_product', 113, '1/2 cup', 300, '{milk}', false, 81.0, 10.45, 2.27, 4.76, 0.0, 308.0),
  (171267, 'Milk, 2%', 'Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D', 'dairy', 'animal_product', 244, '1 cup', 500, '{milk}', false, 50.0, 3.3, 1.98, 4.8, 0.0, 47.0),
  (173414, 'Cheddar cheese', 'Cheese, cheddar (Includes foods for USDA''s Food Distribution Program)', 'dairy', 'animal_product', 28, '1 oz', 60, '{milk}', false, 403.0, 22.87, 33.31, 3.37, 0.0, 653.0),
  (170847, 'Mozzarella, part-skim', 'Cheese, mozzarella, part skim milk', 'dairy', 'animal_product', 28, '1 oz', 80, '{milk}', false, 254.0, 24.26, 15.92, 2.77, 0.0, 619.0),
  (173768, 'Soy milk, unsweetened', 'Soymilk, original and vanilla, light, unsweetened, with added calcium, vitamins A and D', 'dairy_alternative', 'plant', 243, '1 cup', 500, '{soy}', false, 34.0, 2.62, 0.85, 3.85, 0.6, 63.0),
  (174832, 'Almond milk, unsweetened', 'Beverages, almond milk, unsweetened, shelf stable', 'dairy_alternative', 'plant', 240, '1 cup', 500, '{tree_nut}', false, 15.0, 0.4, 0.96, 1.31, 0.2, 72.0),
  (169704, 'Brown rice, cooked', 'Rice, brown, long-grain, cooked (Includes foods for USDA''s Food Distribution Program)', 'grain', 'plant', 150, '3/4 cup', 300, '{}', false, 123.0, 2.74, 0.97, 25.58, 1.6, 4.0),
  (168878, 'White rice, cooked', 'Rice, white, long-grain, regular, enriched, cooked', 'grain', 'plant', 150, '3/4 cup', 300, '{}', false, 130.0, 2.69, 0.28, 28.17, 0.4, 1.0),
  (168917, 'Quinoa, cooked', 'Quinoa, cooked', 'grain', 'plant', 150, '3/4 cup', 300, '{}', false, 120.0, 4.4, 1.92, 21.3, 2.8, 7.0),
  (173904, 'Rolled oats, dry', 'Cereals, oats, regular and quick, not fortified, dry', 'grain', 'plant', 40, '1/2 cup dry', 100, '{}', true, 379.0, 13.15, 6.52, 67.7, 10.1, 6.0),
  (168910, 'Whole-wheat pasta, cooked', 'Pasta, whole-wheat, cooked (Includes foods for USDA''s Food Distribution Program)', 'grain', 'plant', 140, '1 cup', 300, '{wheat,egg}', true, 149.0, 5.99, 1.71, 30.07, 3.9, 4.0),
  (169737, 'Pasta, cooked', 'Pasta, cooked, enriched, without added salt', 'grain', 'plant', 140, '1 cup', 300, '{wheat,egg}', true, 158.0, 5.8, 0.93, 30.86, 1.8, 1.0),
  (170285, 'Barley, pearled, cooked', 'Barley, pearled, cooked', 'grain', 'plant', 157, '1 cup', 300, '{}', true, 123.0, 2.26, 0.44, 28.22, 3.8, 3.0),
  (169700, 'Couscous, cooked', 'Couscous, cooked', 'grain', 'plant', 157, '1 cup', 300, '{wheat}', true, 112.0, 3.79, 0.16, 23.22, 1.4, 5.0),
  (170093, 'Potato, baked with skin', 'Potatoes, baked, flesh and skin, without salt', 'starchy_vegetable', 'plant', 173, '1 medium', 400, '{}', false, 93.0, 2.5, 0.13, 21.15, 2.2, 10.0),
  (168483, 'Sweet potato, baked', 'Sweet potato, cooked, baked in skin, flesh, without salt', 'starchy_vegetable', 'plant', 114, '1 small', 350, '{}', false, 90.0, 2.01, 0.15, 20.71, 3.3, 36.0),
  (168399, 'Corn kernels, cooked', 'Corn, sweet, yellow, frozen, kernels cut off cob, boiled, drained, without salt', 'starchy_vegetable', 'plant', 82, '1/2 cup', 250, '{}', false, 81.0, 2.55, 0.67, 19.3, 2.4, 1.0),
  (170017, 'Green peas, cooked', 'Peas, green, frozen, cooked, boiled, drained, without salt', 'starchy_vegetable', 'plant', 80, '1/2 cup', 250, '{}', false, 78.0, 5.15, 0.27, 14.26, 4.5, 72.0),
  (170379, 'Broccoli', 'Broccoli, raw', 'vegetable', 'plant', 90, '1 cup chopped', 300, '{}', false, 34.0, 2.82, 0.37, 6.64, 2.6, 33.0),
  (168462, 'Spinach', 'Spinach, raw', 'vegetable', 'plant', 30, '1 cup', 150, '{}', false, 23.0, 2.86, 0.39, 3.63, 2.2, 79.0),
  (170393, 'Carrots', 'Carrots, raw', 'vegetable', 'plant', 61, '1 medium', 250, '{}', false, 41.0, 0.93, 0.24, 9.58, 2.8, 69.0),
  (170108, 'Red bell pepper', 'Peppers, sweet, red, raw', 'vegetable', 'plant', 119, '1 medium', 300, '{}', false, 26.0, 0.99, 0.3, 6.03, 2.1, 4.0),
  (170457, 'Tomato', 'Tomatoes, red, ripe, raw, year round average', 'vegetable', 'plant', 123, '1 medium', 300, '{}', false, 18.0, 0.88, 0.2, 3.89, 1.2, 5.0),
  (168409, 'Cucumber', 'Cucumber, with peel, raw', 'vegetable', 'plant', 104, '1 cup sliced', 300, '{}', false, 15.0, 0.65, 0.11, 3.63, 0.5, 2.0),
  (169247, 'Romaine lettuce', 'Lettuce, cos or romaine, raw', 'vegetable', 'plant', 47, '1 cup shredded', 200, '{}', false, 17.0, 1.23, 0.3, 3.29, 2.1, 8.0),
  (168421, 'Kale', 'Kale, raw', 'vegetable', 'plant', 21, '1 cup chopped', 150, '{}', false, 35.0, 2.92, 1.49, 4.42, 4.1, 53.0),
  (169986, 'Cauliflower', 'Cauliflower, raw', 'vegetable', 'plant', 107, '1 cup chopped', 300, '{}', false, 25.0, 1.92, 0.28, 4.97, 2.0, 30.0),
  (169291, 'Zucchini', 'Squash, summer, zucchini, includes skin, raw', 'vegetable', 'plant', 124, '1 cup chopped', 300, '{}', false, 17.0, 1.21, 0.32, 3.11, 1.0, 8.0),
  (168389, 'Asparagus', 'Asparagus, raw', 'vegetable', 'plant', 134, '1 cup', 300, '{}', false, 20.0, 2.2, 0.12, 3.88, 2.1, 2.0),
  (170000, 'Onion', 'Onions, raw', 'vegetable', 'plant', 40, '1/4 cup chopped', 150, '{}', false, 40.0, 1.1, 0.1, 9.34, 1.7, 4.0),
  (169251, 'White mushrooms', 'Mushrooms, white, raw', 'vegetable', 'plant', 70, '1 cup sliced', 250, '{}', false, 22.0, 3.09, 0.34, 3.26, 1.0, 5.0),
  (169961, 'Green beans', 'Beans, snap, green, raw', 'vegetable', 'plant', 100, '1 cup', 300, '{}', false, 31.0, 1.83, 0.22, 6.97, 2.7, 6.0),
  (170383, 'Brussels sprouts', 'Brussels sprouts, raw', 'vegetable', 'plant', 88, '1 cup', 300, '{}', false, 43.0, 3.38, 0.3, 8.95, 3.8, 25.0),
  (169975, 'Cabbage', 'Cabbage, raw', 'vegetable', 'plant', 89, '1 cup chopped', 300, '{}', false, 25.0, 1.28, 0.1, 5.8, 2.5, 18.0),
  (171688, 'Apple', 'Apples, raw, with skin (Includes foods for USDA''s Food Distribution Program)', 'fruit', 'plant', 182, '1 medium', 300, '{}', false, 52.0, 0.26, 0.17, 13.81, 2.4, 1.0),
  (173944, 'Banana', 'Bananas, raw', 'fruit', 'plant', 118, '1 medium', 240, '{}', false, 89.0, 1.09, 0.33, 22.84, 2.6, 1.0),
  (171711, 'Blueberries', 'Blueberries, raw', 'fruit', 'plant', 148, '1 cup', 300, '{}', false, 57.0, 0.74, 0.33, 14.49, 2.4, 1.0),
  (167762, 'Strawberries', 'Strawberries, raw', 'fruit', 'plant', 152, '1 cup halves', 300, '{}', false, 32.0, 0.67, 0.3, 7.68, 2.0, 1.0),
  (169097, 'Orange', 'Oranges, raw, all commercial varieties', 'fruit', 'plant', 131, '1 medium', 262, '{}', false, 47.0, 0.94, 0.12, 11.75, 2.4, 0.0),
  (174683, 'Grapes', 'Grapes, red or green (European type, such as Thompson seedless), raw', 'fruit', 'plant', 92, '1 cup', 250, '{}', false, 69.0, 0.72, 0.16, 18.1, 0.9, 2.0),
  (167755, 'Raspberries', 'Raspberries, raw', 'fruit', 'plant', 123, '1 cup', 250, '{}', false, 52.0, 1.2, 0.65, 11.94, 6.5, 1.0),
  (169118, 'Pear', 'Pears, raw', 'fruit', 'plant', 178, '1 medium', 300, '{}', false, 57.0, 0.36, 0.14, 15.23, 3.1, 1.0),
  (169928, 'Peach', 'Peaches, yellow, raw', 'fruit', 'plant', 150, '1 medium', 300, '{}', false, 39.0, 0.91, 0.25, 9.54, 1.5, 0.0),
  (169124, 'Pineapple', 'Pineapple, raw, all varieties', 'fruit', 'plant', 165, '1 cup chunks', 330, '{}', false, 50.0, 0.54, 0.12, 13.12, 1.4, 1.0),
  (169910, 'Mango', 'Mangos, raw', 'fruit', 'plant', 165, '1 cup pieces', 330, '{}', false, 60.0, 0.82, 0.38, 14.98, 1.6, 1.0),
  (169092, 'Cantaloupe', 'Melons, cantaloupe, raw', 'fruit', 'plant', 160, '1 cup cubes', 320, '{}', false, 34.0, 0.84, 0.19, 8.16, 0.9, 16.0),
  (171705, 'Avocado', 'Avocados, raw, all commercial varieties', 'fat', 'plant', 50, '1/3 medium', 150, '{}', false, 160.0, 2.0, 14.66, 8.53, 6.7, 7.0),
  (170567, 'Almonds', 'Nuts, almonds', 'fat', 'plant', 28, '1 oz (about 23)', 60, '{tree_nut,peanut}', false, 579.0, 21.15, 49.93, 21.55, 12.5, 1.0),
  (170187, 'Walnuts', 'Nuts, walnuts, english', 'fat', 'plant', 28, '1 oz', 60, '{tree_nut,peanut}', false, 654.0, 15.23, 65.21, 13.71, 6.7, 2.0),
  (170162, 'Cashews', 'Nuts, cashew nuts, raw', 'fat', 'plant', 28, '1 oz', 60, '{tree_nut,peanut}', false, 553.0, 18.22, 43.85, 30.19, 3.3, 12.0),
  (172470, 'Peanut butter, smooth', 'Peanut butter, smooth style, without salt', 'fat', 'plant', 32, '2 tbsp', 64, '{peanut,tree_nut}', false, 598.0, 22.21, 51.36, 22.31, 5.0, 17.0),
  (173806, 'Peanuts, dry-roasted', 'Peanuts, all types, dry-roasted, without salt', 'fat', 'plant', 28, '1 oz', 60, '{peanut,tree_nut}', false, 587.0, 24.35, 49.66, 21.26, 8.4, 6.0),
  (170554, 'Chia seeds', 'Seeds, chia seeds, dried', 'fat', 'plant', 15, '1 tbsp', 40, '{}', false, 486.0, 16.54, 30.74, 42.12, 34.4, 16.0),
  (169414, 'Ground flaxseed', 'Seeds, flaxseed', 'fat', 'plant', 10, '1 tbsp', 30, '{}', false, 534.0, 18.29, 42.16, 28.88, 27.3, 30.0),
  (170556, 'Pumpkin seeds', 'Seeds, pumpkin and squash seed kernels, dried', 'fat', 'plant', 28, '1 oz', 50, '{}', false, 559.0, 30.23, 49.05, 10.71, 6.0, 7.0),
  (170562, 'Sunflower seeds', 'Seeds, sunflower seed kernels, dried', 'fat', 'plant', 28, '1 oz', 50, '{}', false, 584.0, 20.78, 51.46, 20.0, 8.6, 9.0),
  (168604, 'Tahini', 'Seeds, sesame butter, tahini, type of kernels unspecified', 'fat', 'plant', 15, '1 tbsp', 45, '{sesame}', false, 592.0, 17.4, 53.01, 21.5, 4.7, 35.0),
  (171413, 'Olive oil', 'Oil, olive, salad or cooking', 'fat', 'plant', 14, '1 tbsp', 30, '{}', false, 884.0, 0.0, 100.0, 0.0, 0.0, 2.0),
  (172336, 'Canola oil', 'Oil, canola', 'fat', 'plant', 14, '1 tbsp', 30, '{}', false, 884.0, 0.0, 100.0, 0.0, 0.0, 0.0),
  (173410, 'Butter', 'Butter, salted', 'fat', 'animal_product', 14, '1 tbsp', 28, '{milk}', false, 717.0, 0.85, 81.11, 0.06, 0.0, 643.0),
  (169640, 'Honey', 'Honey', 'sweetener', 'animal_product', 21, '1 tbsp', 42, '{}', false, 304.0, 0.3, 0.0, 82.4, 0.2, 4.0)
on conflict (fdc_id) do nothing;
