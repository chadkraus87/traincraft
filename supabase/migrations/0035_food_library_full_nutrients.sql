-- Import the rest of the USDA nutrient profile for the food library.
--
-- 0032 imported six nutrients, which is enough to hit a calorie and protein
-- target and nothing else. The clinical review's sharpest point was that a
-- plan could therefore pass QA as `final` while being nutritionally indefensible
-- -- and that a vegan plan had no B12 source anywhere in the pool, with nothing
-- able to notice. Micronutrient adequacy was not failing; it was not computable.
--
-- Same provenance as 0032: USDA FoodData Central, SR Legacy (April 2018),
-- public domain, keyed by the fdc_id already stored on each row. Values are
-- per 100 g and copied from the dataset; none are estimated. While importing,
-- all six existing columns were re-verified against the same source across all
-- 82 rows and matched exactly.
--
-- Every column is nullable, because SR Legacy genuinely lacks some values
-- (sugars for tahini, chia, tofu and tempeh; B12 for shrimp). Null means
-- unknown, and the adequacy checks treat unknown as a failure rather than as
-- zero -- the same fail-closed rule the rest of the pipeline uses.

alter table foods
  add column calcium_mg numeric(7,1),
  add column iron_mg numeric(6,2),
  add column magnesium_mg numeric(7,1),
  add column potassium_mg numeric(7,1),
  add column zinc_mg numeric(6,2),
  add column b12_ug numeric(6,2),
  add column vit_d_ug numeric(6,2),
  add column vit_k_ug numeric(7,1),
  add column vit_a_ug numeric(7,1),
  add column folate_ug numeric(7,1),
  add column sat_fat_g numeric(6,2),
  add column sugars_g numeric(6,2);

comment on column foods.b12_ug is
  'Null means SR Legacy has no value, which the adequacy check treats as unknown, not zero.';

update foods set calcium_mg = 25.0, iron_mg = 0.69, magnesium_mg = 22.0, potassium_mg = 151.0, zinc_mg = 0.42, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 7.8, vit_a_ug = 2.0, folate_ug = 21.0, sat_fat_g = 0.019, sugars_g = 4.42 where fdc_id = 167755;
update foods set calcium_mg = 16.0, iron_mg = 0.41, magnesium_mg = 13.0, potassium_mg = 153.0, zinc_mg = 0.14, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.2, vit_a_ug = 1.0, folate_ug = 24.0, sat_fat_g = 0.015, sugars_g = 4.89 where fdc_id = 167762;
update foods set calcium_mg = 6.0, iron_mg = 1.15, magnesium_mg = 29.0, potassium_mg = 421.0, zinc_mg = 2.42, b12_ug = 0.57, vit_d_ug = 0.2, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 0.0, sat_fat_g = 1.198, sugars_g = 0.0 where fdc_id = 168250;
update foods set calcium_mg = 24.0, iron_mg = 2.14, magnesium_mg = 14.0, potassium_mg = 202.0, zinc_mg = 0.54, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 41.6, vit_a_ug = 38.0, folate_ug = 52.0, sat_fat_g = 0.04, sugars_g = 1.88 where fdc_id = 168389;
update foods set calcium_mg = 3.0, iron_mg = 0.47, magnesium_mg = 28.0, potassium_mg = 233.0, zinc_mg = 0.63, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.3, vit_a_ug = 10.0, folate_ug = 35.0, sat_fat_g = 0.103, sugars_g = 3.07 where fdc_id = 168399;
update foods set calcium_mg = 16.0, iron_mg = 0.28, magnesium_mg = 13.0, potassium_mg = 147.0, zinc_mg = 0.2, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 16.4, vit_a_ug = 5.0, folate_ug = 7.0, sat_fat_g = 0.037, sugars_g = 1.67 where fdc_id = 168409;
update foods set calcium_mg = 63.0, iron_mg = 2.27, magnesium_mg = 64.0, potassium_mg = 436.0, zinc_mg = 1.37, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 26.7, vit_a_ug = 15.0, folate_ug = 311.0, sat_fat_g = 0.62, sugars_g = 2.18 where fdc_id = 168411;
update foods set calcium_mg = 254.0, iron_mg = 1.6, magnesium_mg = 33.0, potassium_mg = 348.0, zinc_mg = 0.39, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 389.6, vit_a_ug = 241.0, folate_ug = 62.0, sat_fat_g = 0.178, sugars_g = 0.99 where fdc_id = 168421;
update foods set calcium_mg = 99.0, iron_mg = 2.71, magnesium_mg = 79.0, potassium_mg = 558.0, zinc_mg = 0.53, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 482.9, vit_a_ug = 469.0, folate_ug = 194.0, sat_fat_g = 0.063, sugars_g = 0.42 where fdc_id = 168462;
update foods set calcium_mg = 38.0, iron_mg = 0.69, magnesium_mg = 27.0, potassium_mg = 475.0, zinc_mg = 0.32, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.3, vit_a_ug = 961.0, folate_ug = 6.0, sat_fat_g = 0.052, sugars_g = 6.48 where fdc_id = 168483;
update foods set calcium_mg = 141.0, iron_mg = 4.42, magnesium_mg = 95.0, potassium_mg = 459.0, zinc_mg = 4.62, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = null, vit_a_ug = 3.0, folate_ug = 98.0, sat_fat_g = 7.423, sugars_g = null where fdc_id = 168604;
update foods set calcium_mg = 20.0, iron_mg = 1.96, magnesium_mg = 26.0, potassium_mg = 393.0, zinc_mg = 5.71, b12_ug = 1.71, vit_d_ug = 0.1, vit_k_ug = 1.4, vit_a_ug = 0.0, folate_ug = 10.0, sat_fat_g = 2.205, sugars_g = 0.0 where fdc_id = 168634;
update foods set calcium_mg = 10.0, iron_mg = 1.2, magnesium_mg = 12.0, potassium_mg = 35.0, zinc_mg = 0.49, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 97.0, sat_fat_g = 0.077, sugars_g = 0.05 where fdc_id = 168878;
update foods set calcium_mg = 13.0, iron_mg = 1.72, magnesium_mg = 54.0, potassium_mg = 96.0, zinc_mg = 1.34, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.6, vit_a_ug = 0.0, folate_ug = 21.0, sat_fat_g = 0.243, sugars_g = 0.75 where fdc_id = 168910;
update foods set calcium_mg = 17.0, iron_mg = 1.49, magnesium_mg = 64.0, potassium_mg = 172.0, zinc_mg = 1.09, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 42.0, sat_fat_g = 0.231, sugars_g = 0.87 where fdc_id = 168917;
update foods set calcium_mg = 9.0, iron_mg = 0.21, magnesium_mg = 12.0, potassium_mg = 267.0, zinc_mg = 0.18, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.5, vit_a_ug = 169.0, folate_ug = 21.0, sat_fat_g = 0.051, sugars_g = 7.86 where fdc_id = 169092;
update foods set calcium_mg = 40.0, iron_mg = 0.1, magnesium_mg = 10.0, potassium_mg = 181.0, zinc_mg = 0.07, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 11.0, folate_ug = 30.0, sat_fat_g = 0.015, sugars_g = 9.35 where fdc_id = 169097;
update foods set calcium_mg = 9.0, iron_mg = 0.18, magnesium_mg = 7.0, potassium_mg = 116.0, zinc_mg = 0.1, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.4, vit_a_ug = 1.0, folate_ug = 7.0, sat_fat_g = 0.022, sugars_g = 9.75 where fdc_id = 169118;
update foods set calcium_mg = 13.0, iron_mg = 0.29, magnesium_mg = 12.0, potassium_mg = 109.0, zinc_mg = 0.12, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.7, vit_a_ug = 3.0, folate_ug = 18.0, sat_fat_g = 0.009, sugars_g = 9.85 where fdc_id = 169124;
update foods set calcium_mg = 33.0, iron_mg = 0.97, magnesium_mg = 14.0, potassium_mg = 247.0, zinc_mg = 0.23, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 102.5, vit_a_ug = 436.0, folate_ug = 136.0, sat_fat_g = 0.039, sugars_g = 1.19 where fdc_id = 169247;
update foods set calcium_mg = 3.0, iron_mg = 0.5, magnesium_mg = 9.0, potassium_mg = 318.0, zinc_mg = 0.52, b12_ug = 0.04, vit_d_ug = 0.2, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 17.0, sat_fat_g = 0.05, sugars_g = 1.98 where fdc_id = 169251;
update foods set calcium_mg = 16.0, iron_mg = 0.37, magnesium_mg = 18.0, potassium_mg = 261.0, zinc_mg = 0.32, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.3, vit_a_ug = 10.0, folate_ug = 24.0, sat_fat_g = 0.084, sugars_g = 2.5 where fdc_id = 169291;
update foods set calcium_mg = 255.0, iron_mg = 5.73, magnesium_mg = 392.0, potassium_mg = 813.0, zinc_mg = 4.34, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.3, vit_a_ug = 0.0, folate_ug = 87.0, sat_fat_g = 3.663, sugars_g = 1.55 where fdc_id = 169414;
update foods set calcium_mg = 6.0, iron_mg = 0.42, magnesium_mg = 2.0, potassium_mg = 52.0, zinc_mg = 0.22, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 2.0, sat_fat_g = 0.0, sugars_g = 82.12 where fdc_id = 169640;
update foods set calcium_mg = 8.0, iron_mg = 0.38, magnesium_mg = 8.0, potassium_mg = 58.0, zinc_mg = 0.26, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.1, vit_a_ug = 0.0, folate_ug = 15.0, sat_fat_g = 0.029, sugars_g = 0.1 where fdc_id = 169700;
update foods set calcium_mg = 3.0, iron_mg = 0.56, magnesium_mg = 39.0, potassium_mg = 86.0, zinc_mg = 0.71, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.2, vit_a_ug = 0.0, folate_ug = 9.0, sat_fat_g = 0.26, sugars_g = 0.24 where fdc_id = 169704;
update foods set calcium_mg = 7.0, iron_mg = 1.28, magnesium_mg = 18.0, potassium_mg = 44.0, zinc_mg = 0.51, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 119.0, sat_fat_g = 0.176, sugars_g = 0.56 where fdc_id = 169737;
update foods set calcium_mg = 11.0, iron_mg = 0.16, magnesium_mg = 10.0, potassium_mg = 168.0, zinc_mg = 0.09, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.2, vit_a_ug = 54.0, folate_ug = 43.0, sat_fat_g = 0.092, sugars_g = 13.66 where fdc_id = 169910;
update foods set calcium_mg = 6.0, iron_mg = 0.25, magnesium_mg = 9.0, potassium_mg = 190.0, zinc_mg = 0.17, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.6, vit_a_ug = 16.0, folate_ug = 4.0, sat_fat_g = 0.019, sugars_g = 8.39 where fdc_id = 169928;
update foods set calcium_mg = 37.0, iron_mg = 1.03, magnesium_mg = 25.0, potassium_mg = 211.0, zinc_mg = 0.24, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 43.0, vit_a_ug = 35.0, folate_ug = 33.0, sat_fat_g = 0.05, sugars_g = 3.26 where fdc_id = 169961;
update foods set calcium_mg = 40.0, iron_mg = 0.47, magnesium_mg = 12.0, potassium_mg = 170.0, zinc_mg = 0.18, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 76.0, vit_a_ug = 5.0, folate_ug = 43.0, sat_fat_g = 0.034, sugars_g = 3.2 where fdc_id = 169975;
update foods set calcium_mg = 22.0, iron_mg = 0.42, magnesium_mg = 15.0, potassium_mg = 299.0, zinc_mg = 0.27, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 15.5, vit_a_ug = 0.0, folate_ug = 57.0, sat_fat_g = 0.13, sugars_g = 1.91 where fdc_id = 169986;
update foods set calcium_mg = 23.0, iron_mg = 0.21, magnesium_mg = 10.0, potassium_mg = 146.0, zinc_mg = 0.17, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.4, vit_a_ug = 0.0, folate_ug = 19.0, sat_fat_g = 0.042, sugars_g = 4.24 where fdc_id = 170000;
update foods set calcium_mg = 24.0, iron_mg = 1.52, magnesium_mg = 22.0, potassium_mg = 110.0, zinc_mg = 0.67, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 24.0, vit_a_ug = 105.0, folate_ug = 59.0, sat_fat_g = 0.049, sugars_g = 4.4 where fdc_id = 170017;
update foods set calcium_mg = 15.0, iron_mg = 1.08, magnesium_mg = 28.0, potassium_mg = 535.0, zinc_mg = 0.36, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.0, vit_a_ug = 1.0, folate_ug = 28.0, sat_fat_g = 0.034, sugars_g = 1.18 where fdc_id = 170093;
update foods set calcium_mg = 7.0, iron_mg = 0.43, magnesium_mg = 12.0, potassium_mg = 211.0, zinc_mg = 0.25, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.9, vit_a_ug = 157.0, folate_ug = 46.0, sat_fat_g = 0.059, sugars_g = 4.2 where fdc_id = 170108;
update foods set calcium_mg = 37.0, iron_mg = 6.68, magnesium_mg = 292.0, potassium_mg = 660.0, zinc_mg = 5.78, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 34.1, vit_a_ug = 0.0, folate_ug = 25.0, sat_fat_g = 7.783, sugars_g = 5.91 where fdc_id = 170162;
update foods set calcium_mg = 98.0, iron_mg = 2.91, magnesium_mg = 158.0, potassium_mg = 441.0, zinc_mg = 3.09, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.7, vit_a_ug = 1.0, folate_ug = 98.0, sat_fat_g = 6.126, sugars_g = 2.61 where fdc_id = 170187;
update foods set calcium_mg = 11.0, iron_mg = 1.33, magnesium_mg = 22.0, potassium_mg = 93.0, zinc_mg = 0.82, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.8, vit_a_ug = 0.0, folate_ug = 16.0, sat_fat_g = 0.093, sugars_g = 0.28 where fdc_id = 170285;
update foods set calcium_mg = 47.0, iron_mg = 0.73, magnesium_mg = 21.0, potassium_mg = 316.0, zinc_mg = 0.41, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 101.6, vit_a_ug = 31.0, folate_ug = 63.0, sat_fat_g = 0.114, sugars_g = 1.7 where fdc_id = 170379;
update foods set calcium_mg = 42.0, iron_mg = 1.4, magnesium_mg = 23.0, potassium_mg = 389.0, zinc_mg = 0.42, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 177.0, vit_a_ug = 38.0, folate_ug = 61.0, sat_fat_g = 0.062, sugars_g = 2.2 where fdc_id = 170383;
update foods set calcium_mg = 33.0, iron_mg = 0.3, magnesium_mg = 12.0, potassium_mg = 320.0, zinc_mg = 0.24, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 13.2, vit_a_ug = 835.0, folate_ug = 19.0, sat_fat_g = 0.032, sugars_g = 4.74 where fdc_id = 170393;
update foods set calcium_mg = 10.0, iron_mg = 0.27, magnesium_mg = 11.0, potassium_mg = 237.0, zinc_mg = 0.17, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 7.9, vit_a_ug = 42.0, folate_ug = 15.0, sat_fat_g = 0.028, sugars_g = 2.63 where fdc_id = 170457;
update foods set calcium_mg = 631.0, iron_mg = 7.72, magnesium_mg = 335.0, potassium_mg = 407.0, zinc_mg = 4.58, b12_ug = 0.0, vit_d_ug = null, vit_k_ug = null, vit_a_ug = null, folate_ug = null, sat_fat_g = 3.33, sugars_g = null where fdc_id = 170554;
update foods set calcium_mg = 46.0, iron_mg = 8.82, magnesium_mg = 592.0, potassium_mg = 809.0, zinc_mg = 7.81, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 7.3, vit_a_ug = 1.0, folate_ug = 58.0, sat_fat_g = 8.659, sugars_g = 1.4 where fdc_id = 170556;
update foods set calcium_mg = 78.0, iron_mg = 5.25, magnesium_mg = 325.0, potassium_mg = 645.0, zinc_mg = 5.0, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 3.0, folate_ug = 227.0, sat_fat_g = 4.455, sugars_g = 2.62 where fdc_id = 170562;
update foods set calcium_mg = 269.0, iron_mg = 3.71, magnesium_mg = 270.0, potassium_mg = 733.0, zinc_mg = 3.12, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 44.0, sat_fat_g = 3.802, sugars_g = 4.35 where fdc_id = 170567;
update foods set calcium_mg = 782.0, iron_mg = 0.22, magnesium_mg = 23.0, potassium_mg = 84.0, zinc_mg = 2.76, b12_ug = 0.82, vit_d_ug = 0.3, vit_k_ug = 1.6, vit_a_ug = 127.0, folate_ug = 9.0, sat_fat_g = 10.114, sugars_g = 1.13 where fdc_id = 170847;
update foods set calcium_mg = 110.0, iron_mg = 0.07, magnesium_mg = 11.0, potassium_mg = 141.0, zinc_mg = 0.52, b12_ug = 0.75, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 1.0, folate_ug = 7.0, sat_fat_g = 0.117, sugars_g = 3.24 where fdc_id = 170894;
update foods set calcium_mg = 120.0, iron_mg = 0.02, magnesium_mg = 11.0, potassium_mg = 140.0, zinc_mg = 0.48, b12_ug = 0.53, vit_d_ug = 1.2, vit_k_ug = 0.2, vit_a_ug = 55.0, folate_ug = 5.0, sat_fat_g = 1.257, sugars_g = 5.06 where fdc_id = 171267;
update foods set calcium_mg = 1.0, iron_mg = 0.56, magnesium_mg = 0.0, potassium_mg = 1.0, zinc_mg = 0.0, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 60.2, vit_a_ug = 0.0, folate_ug = 0.0, sat_fat_g = 13.808, sugars_g = 0.0 where fdc_id = 171413;
update foods set calcium_mg = 15.0, iron_mg = 1.04, magnesium_mg = 29.0, potassium_mg = 256.0, zinc_mg = 1.0, b12_ug = 0.34, vit_d_ug = 0.1, vit_k_ug = 0.3, vit_a_ug = 6.0, folate_ug = 4.0, sat_fat_g = 1.01, sugars_g = 0.0 where fdc_id = 171477;
update foods set calcium_mg = 6.0, iron_mg = 0.12, magnesium_mg = 5.0, potassium_mg = 107.0, zinc_mg = 0.04, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.2, vit_a_ug = 3.0, folate_ug = 3.0, sat_fat_g = 0.028, sugars_g = 10.39 where fdc_id = 171688;
update foods set calcium_mg = 12.0, iron_mg = 0.55, magnesium_mg = 29.0, potassium_mg = 485.0, zinc_mg = 0.64, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 21.0, vit_a_ug = 7.0, folate_ug = 81.0, sat_fat_g = 2.126, sugars_g = 0.66 where fdc_id = 171705;
update foods set calcium_mg = 6.0, iron_mg = 0.28, magnesium_mg = 6.0, potassium_mg = 77.0, zinc_mg = 0.16, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 19.3, vit_a_ug = 3.0, folate_ug = 6.0, sat_fat_g = 0.028, sugars_g = 9.96 where fdc_id = 171711;
update foods set calcium_mg = 14.0, iron_mg = 0.49, magnesium_mg = 42.0, potassium_mg = 244.0, zinc_mg = 0.58, b12_ug = 1.05, vit_d_ug = 1.2, vit_k_ug = 0.1, vit_a_ug = 14.0, folate_ug = 8.0, sat_fat_g = 0.168, sugars_g = 0.0 where fdc_id = 171956;
update foods set calcium_mg = 11.0, iron_mg = 1.53, magnesium_mg = 27.0, potassium_mg = 237.0, zinc_mg = 0.77, b12_ug = 2.99, vit_d_ug = null, vit_k_ug = null, vit_a_ug = null, folate_ug = 4.0, sat_fat_g = 0.234, sugars_g = 0.0 where fdc_id = 171986;
update foods set calcium_mg = 111.0, iron_mg = 0.13, magnesium_mg = 9.0, potassium_mg = 125.0, zinc_mg = 0.51, b12_ug = 0.47, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 68.0, folate_ug = 8.0, sat_fat_g = 1.235, sugars_g = 4.0 where fdc_id = 172182;
update foods set calcium_mg = 7.0, iron_mg = 0.08, magnesium_mg = 11.0, potassium_mg = 163.0, zinc_mg = 0.03, b12_ug = 0.09, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 4.0, sat_fat_g = 0.0, sugars_g = 0.71 where fdc_id = 172183;
update foods set calcium_mg = 0.0, iron_mg = 0.0, magnesium_mg = 0.0, potassium_mg = 0.0, zinc_mg = 0.0, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 71.3, vit_a_ug = 0.0, folate_ug = 0.0, sat_fat_g = 7.365, sugars_g = 0.0 where fdc_id = 172336;
update foods set calcium_mg = 9.0, iron_mg = 1.13, magnesium_mg = 24.0, potassium_mg = 269.0, zinc_mg = 1.92, b12_ug = 0.42, vit_d_ug = 0.2, vit_k_ug = 3.9, vit_a_ug = 8.0, folate_ug = 5.0, sat_fat_g = 2.311, sugars_g = 0.0 where fdc_id = 172388;
update foods set calcium_mg = 19.0, iron_mg = 3.33, magnesium_mg = 36.0, potassium_mg = 369.0, zinc_mg = 1.27, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 1.7, vit_a_ug = 0.0, folate_ug = 181.0, sat_fat_g = 0.053, sugars_g = 1.8 where fdc_id = 172421;
update foods set calcium_mg = 49.0, iron_mg = 1.74, magnesium_mg = 168.0, potassium_mg = 558.0, zinc_mg = 2.51, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.3, vit_a_ug = 0.0, folate_ug = 87.0, sat_fat_g = 10.325, sugars_g = 10.49 where fdc_id = 172470;
update foods set calcium_mg = 683.0, iron_mg = 2.66, magnesium_mg = 58.0, potassium_mg = 237.0, zinc_mg = 1.57, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = null, vit_a_ug = null, folate_ug = 29.0, sat_fat_g = 1.261, sugars_g = null where fdc_id = 172475;
update foods set calcium_mg = 31.0, iron_mg = 1.56, magnesium_mg = 29.0, potassium_mg = 304.0, zinc_mg = 3.77, b12_ug = 1.9, vit_d_ug = 0.2, vit_k_ug = 0.0, vit_a_ug = 30.0, folate_ug = 7.0, sat_fat_g = 2.966, sugars_g = 0.0 where fdc_id = 172851;
update foods set calcium_mg = 24.0, iron_mg = 0.02, magnesium_mg = 2.0, potassium_mg = 24.0, zinc_mg = 0.09, b12_ug = 0.17, vit_d_ug = 0.0, vit_k_ug = 7.0, vit_a_ug = 684.0, folate_ug = 3.0, sat_fat_g = 51.368, sugars_g = 0.06 where fdc_id = 173410;
update foods set calcium_mg = 710.0, iron_mg = 0.14, magnesium_mg = 27.0, potassium_mg = 76.0, zinc_mg = 3.64, b12_ug = 1.1, vit_d_ug = 0.6, vit_k_ug = 2.4, vit_a_ug = 337.0, folate_ug = 27.0, sat_fat_g = 18.867, sugars_g = 0.48 where fdc_id = 173414;
update foods set calcium_mg = 50.0, iron_mg = 1.19, magnesium_mg = 10.0, potassium_mg = 126.0, zinc_mg = 1.05, b12_ug = 1.11, vit_d_ug = 2.2, vit_k_ug = 0.3, vit_a_ug = 149.0, folate_ug = 44.0, sat_fat_g = 3.267, sugars_g = 1.12 where fdc_id = 173424;
update foods set calcium_mg = 27.0, iron_mg = 2.1, magnesium_mg = 70.0, potassium_mg = 355.0, zinc_mg = 1.12, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 3.3, vit_a_ug = 0.0, folate_ug = 149.0, sat_fat_g = 0.139, sugars_g = 0.32 where fdc_id = 173735;
update foods set calcium_mg = 35.0, iron_mg = 2.22, magnesium_mg = 42.0, potassium_mg = 405.0, zinc_mg = 1.0, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 8.4, vit_a_ug = 0.0, folate_ug = 130.0, sat_fat_g = 0.073, sugars_g = 0.32 where fdc_id = 173740;
update foods set calcium_mg = 49.0, iron_mg = 2.89, magnesium_mg = 48.0, potassium_mg = 291.0, zinc_mg = 1.53, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 4.0, vit_a_ug = 1.0, folate_ug = 172.0, sat_fat_g = 0.269, sugars_g = 4.8 where fdc_id = 173757;
update foods set calcium_mg = 123.0, iron_mg = 0.46, magnesium_mg = 13.0, potassium_mg = 117.0, zinc_mg = 0.1, b12_ug = 0.23, vit_d_ug = 1.0, vit_k_ug = null, vit_a_ug = null, folate_ug = null, sat_fat_g = 0.078, sugars_g = 0.41 where fdc_id = 173768;
update foods set calcium_mg = 58.0, iron_mg = 1.58, magnesium_mg = 178.0, potassium_mg = 634.0, zinc_mg = 2.77, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 97.0, sat_fat_g = 7.723, sugars_g = 4.9 where fdc_id = 173806;
update foods set calcium_mg = 52.0, iron_mg = 4.25, magnesium_mg = 138.0, potassium_mg = 362.0, zinc_mg = 3.64, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 2.0, vit_a_ug = 0.0, folate_ug = 32.0, sat_fat_g = 1.11, sugars_g = 0.99 where fdc_id = 173904;
update foods set calcium_mg = 5.0, iron_mg = 0.26, magnesium_mg = 27.0, potassium_mg = 358.0, zinc_mg = 0.15, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 0.5, vit_a_ug = 3.0, folate_ug = 20.0, sat_fat_g = 0.112, sugars_g = 12.23 where fdc_id = 173944;
update foods set calcium_mg = 111.0, iron_mg = 2.7, magnesium_mg = 81.0, potassium_mg = 412.0, zinc_mg = 1.14, b12_ug = 0.08, vit_d_ug = 0.0, vit_k_ug = null, vit_a_ug = 0.0, folate_ug = 24.0, sat_fat_g = 2.539, sugars_g = null where fdc_id = 174272;
update foods set calcium_mg = 10.0, iron_mg = 0.36, magnesium_mg = 7.0, potassium_mg = 191.0, zinc_mg = 0.07, b12_ug = 0.0, vit_d_ug = 0.0, vit_k_ug = 14.6, vit_a_ug = 3.0, folate_ug = 2.0, sat_fat_g = 0.054, sugars_g = 15.48 where fdc_id = 174683;
update foods set calcium_mg = 12.0, iron_mg = 3.17, magnesium_mg = 28.0, potassium_mg = 449.0, zinc_mg = 6.97, b12_ug = 2.8, vit_d_ug = 0.0, vit_k_ug = 1.3, vit_a_ug = 3.0, folate_ug = 8.0, sat_fat_g = 3.897, sugars_g = 0.0 where fdc_id = 174755;
update foods set calcium_mg = 184.0, iron_mg = 0.28, magnesium_mg = 6.0, potassium_mg = 67.0, zinc_mg = 0.06, b12_ug = 0.0, vit_d_ug = 1.0, vit_k_ug = 0.0, vit_a_ug = 0.0, folate_ug = 1.0, sat_fat_g = 0.08, sugars_g = 0.81 where fdc_id = 174832;
update foods set calcium_mg = 15.0, iron_mg = 0.34, magnesium_mg = 30.0, potassium_mg = 384.0, zinc_mg = 0.43, b12_ug = 2.8, vit_d_ug = 13.1, vit_k_ug = 0.1, vit_a_ug = 69.0, folate_ug = 34.0, sat_fat_g = 2.397, sugars_g = 0.0 where fdc_id = 175168;
update foods set calcium_mg = 14.0, iron_mg = 0.69, magnesium_mg = 34.0, potassium_mg = 380.0, zinc_mg = 0.41, b12_ug = 1.86, vit_d_ug = 3.7, vit_k_ug = 0.9, vit_a_ug = 0.0, folate_ug = 6.0, sat_fat_g = 0.94, sugars_g = 0.0 where fdc_id = 175177;
update foods set calcium_mg = 70.0, iron_mg = 0.51, magnesium_mg = 39.0, potassium_mg = 259.0, zinc_mg = 1.64, b12_ug = null, vit_d_ug = null, vit_k_ug = null, vit_a_ug = null, folate_ug = null, sat_fat_g = 0.056, sugars_g = null where fdc_id = 175180;
