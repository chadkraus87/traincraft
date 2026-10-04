/**
 * GET /api/export · downloads a full JSON backup of everything this trainer
 * owns. The table list lives in src/lib/export-tables.ts and is checked by the
 * RLS suite against every tenant-scoped table, because this export backs a
 * published promise and is a client's only route to the health data held
 * about them. RLS scopes every query to the caller.
 * JSON rather than CSV deliberately — several tables have array/nested
 * fields (limitation tags, plan session structure) that don't represent
 * cleanly in flat CSV rows without lossy flattening.
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { EXPORT_TABLES, EXPORT_EXCLUDED } from "@/lib/export-tables";

export async function GET() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // One query per exported table, so a new table is added in one place and
  // the test that checks for omissions can see the list.
  const results = await Promise.all(EXPORT_TABLES.map((t) => supabase.from(t).select("*")));
  const failed = EXPORT_TABLES.filter((_, i) => results[i].error);
  if (failed.length > 0) {
    // A partial backup that looks complete is worse than no backup: a trainer
    // would keep it, delete the account, and discover the gap too late.
    return NextResponse.json(
      { error: `Could not export ${failed.join(", ")}. Nothing was downloaded — try again.` },
      { status: 500 }
    );
  }

  const { data: customExercises, error: exercisesError } = await supabase
    .from("exercises").select("*").eq("trainer_id", user.id);
  if (exercisesError) {
    return NextResponse.json({ error: "Could not export your custom exercises. Nothing was downloaded — try again." }, { status: 500 });
  }

  const backup = {
    exported_at: new Date().toISOString(),
    trainer_id: user.id,
    ...Object.fromEntries(EXPORT_TABLES.map((t, i) => [t, results[i].data ?? []])),
    custom_exercises: customExercises ?? [],
    excluded_tables: EXPORT_EXCLUDED,
  };

  const filename = `coachrhythm-backup-${new Date().toISOString().slice(0, 10)}.json`;
  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
