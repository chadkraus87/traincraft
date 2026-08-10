-- Self-serve account and data deletion.
--
-- The privacy policy promises a trainer can delete their account and
-- everything in it. Nothing in the app could do that, and publishing a
-- deletion right you can't honour is a misrepresentation, not a rough edge.
--
-- Deleting the auth.users row is what makes this complete rather than
-- cosmetic: every application table references it with `on delete cascade`,
-- so one delete removes the trainer's profile, their clients, and with those
-- clients every limitation, equipment item, plan, note, goal, log, delivery
-- record and template. The health data goes with it.
--
-- SECURITY DEFINER because auth.users is not writable by the `authenticated`
-- role, and the alternative is a service-role key in the application — a
-- credential that bypasses every RLS policy in this schema, provisioned for
-- one operation. A narrow definer function is the smaller hole: it does
-- exactly one thing, to exactly one row, chosen by the database rather than
-- the caller.
--
-- The safety of that rests on three things, all deliberate:
--   · The row is identified by auth.uid(), never by an argument, so a caller
--     cannot name someone else's account.
--   · search_path is pinned empty and every name is schema-qualified, so the
--     body can't be redirected by a caller-controlled search path.
--   · A null auth.uid() (no session) raises instead of matching nothing
--     quietly — an unauthenticated call should be an error, not a no-op that
--     returns success.

-- EXPECTED ADVISOR WARNING: Supabase's linter flags this as
-- "authenticated_security_definer_function_executable" (0029). That is
-- correct and intended — a signed-in trainer calling it to delete their own
-- account is the entire feature. The two remediations it suggests both break
-- it: SECURITY INVOKER can't write auth.users, and revoking EXECUTE removes
-- the deletion right the privacy policy commits to.
--
-- What makes it safe is the shape, not the privilege level: no arguments, so
-- there is nothing for a caller to point at someone else; a target chosen by
-- the database; and a raise on a null session. tests/rls.test.ts proves
-- trainer B deleting their account leaves trainer A's data intact.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    raise exception 'delete_own_account requires an authenticated session';
  end if;

  -- Cascades through every table that references auth.users(id).
  delete from auth.users where id = caller;
end;
$$;

-- Not callable anonymously. `authenticated` is the role Supabase assigns a
-- signed-in user; anon has no business reaching this at all.
revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;

comment on function public.delete_own_account() is
  'Deletes the calling trainer''s auth user, cascading to all of their data. Target is auth.uid(), never an argument.';
