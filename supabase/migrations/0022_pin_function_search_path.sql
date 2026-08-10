-- Pin the search_path on touch_updated_at.
--
-- Flagged by Supabase's security linter (0011_function_search_path_mutable).
-- A function without a fixed search_path resolves unqualified names using
-- whatever the *caller's* search_path happens to be. If anyone can create an
-- object in a schema that sorts earlier than the intended one, they can
-- shadow a function this trigger calls and have it run with the trigger's
-- privileges.
--
-- Low risk here — the body only calls now(), which lives in pg_catalog and is
-- always searched first — but the fix is one statement and it removes the
-- whole class of problem rather than relying on that detail staying true.
--
-- Empty rather than 'public': this function needs nothing from the public
-- schema, so granting it nothing is the tighter setting.

alter function public.touch_updated_at() set search_path = '';
