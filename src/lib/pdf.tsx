/** PDF renderer for workout plans · @react-pdf/renderer, server-side only. */
import React from "react";
import path from "path";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Client, PlanJson } from "@/lib/types";
import { LIMITATION_LABELS } from "@/lib/safety/rules";
import { PRODUCT, type TrainerBrand } from "@/lib/brand";

// The logo's own background is solid black (no transparency), so rather
// than trying to fake a blend onto the white page, it sits in a header
// band that matches — reads as an intentional brand block, not an
// artifact.
const LOGO_PATH = path.join(process.cwd(), "public", PRODUCT.logoFile);

// The measurement chart is not laid out here. It's a designed, fillable
// AcroForm PDF shipped as an asset — see measurementChartToFillablePdf.
const MEASUREMENT_CHART_TEMPLATE = path.join(
  process.cwd(),
  "public",
  "measurement-chart-template.pdf"
);

const s = StyleSheet.create({
  page: { padding: 0, fontSize: 10, fontFamily: "Helvetica", color: "#16211B" },
  body: { padding: 36 },
  header: { backgroundColor: "#000000", paddingVertical: 16, paddingHorizontal: 36, flexDirection: "row", alignItems: "center", gap: 14 },
  logo: { width: 54, height: 54 },
  headerText: { color: "#F7F0E6" },
  headerBrand: { fontSize: 13, fontFamily: "Helvetica-Bold", letterSpacing: 1 },
  headerCreds: { fontSize: 7, color: "#D8825A", marginTop: 2, letterSpacing: 0.5 },
  h1: { fontSize: 20, fontFamily: "Helvetica-Bold", color: "#1E4D3B" },
  sub: { fontSize: 10, color: "#5C6660", marginTop: 2, marginBottom: 14 },
  day: { fontSize: 13, fontFamily: "Helvetica-Bold", marginTop: 14, marginBottom: 6, color: "#1E4D3B" },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: "#DDD", paddingVertical: 4 },
  head: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1E4D3B", paddingVertical: 4, fontFamily: "Helvetica-Bold" },
  cName: { width: "34%" }, cSets: { width: "10%" }, cReps: { width: "12%" },
  cLoad: { width: "22%" }, cRest: { width: "10%" }, cNote: { width: "12%" },
  cue: { fontSize: 8, color: "#5C6660", marginTop: 1 },
  box: { marginTop: 16, padding: 10, backgroundColor: "#FBF3E1", borderLeftWidth: 3, borderLeftColor: "#E0A63C" },
  boxTitle: { fontFamily: "Helvetica-Bold", marginBottom: 4 },
  prog: { marginTop: 16, padding: 10, backgroundColor: "#F0F4F1" },
  foot: { position: "absolute", bottom: 20, left: 36, right: 36, fontSize: 7, color: "#999" },
});

export async function planToPdf(
  clientRow: Client,
  title: string,
  plan: PlanJson,
  weeks: number,
  brand: TrainerBrand
) {
  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header} fixed>
          <Image src={LOGO_PATH} style={s.logo} />
          <View style={s.headerText}>
            <Text style={s.headerBrand}>{brand.businessName.toUpperCase()}</Text>
            {brand.credentials ? <Text style={s.headerCreds}>{brand.credentials}</Text> : null}
          </View>
        </View>

        <View style={s.body}>
        <Text style={s.h1}>{title}</Text>
        <Text style={s.sub}>
          Prepared for {clientRow.full_name} · {weeks}-week program · {plan.sessions.length} sessions/week
        </Text>

        {plan.sessions.map((sess) => (
          <View key={sess.day} wrap={false}>
            <Text style={s.day}>Day {sess.day} — {sess.focus}</Text>
            <View style={s.head}>
              <Text style={s.cName}>Exercise</Text><Text style={s.cSets}>Sets</Text>
              <Text style={s.cReps}>Reps</Text><Text style={s.cLoad}>Load</Text>
              <Text style={s.cRest}>Rest</Text><Text style={s.cNote}> </Text>
            </View>
            {sess.blocks.map((b, i) => (
              <View key={i} style={s.row}>
                <View style={s.cName}>
                  <Text>{b.name}</Text>
                  {b.coaching_note ? <Text style={s.cue}>{b.coaching_note}</Text> : null}
                </View>
                <Text style={s.cSets}>{b.sets}</Text>
                <Text style={s.cReps}>{b.reps}</Text>
                <Text style={s.cLoad}>{b.load_note}</Text>
                <Text style={s.cRest}>{b.rest_sec}s</Text>
                <Text style={s.cNote}> </Text>
              </View>
            ))}
          </View>
        ))}

        <View style={s.prog} wrap={false}>
          <Text style={s.boxTitle}>Week-to-week progression</Text>
          <Text>{plan.progression_notes}</Text>
        </View>

        {plan.exclusions.length > 0 && (
          <View style={s.box} wrap={false}>
            <Text style={s.boxTitle}>Adjusted for your current limitations</Text>
            {plan.exclusions.slice(0, 8).map((x, i) => (
              <Text key={i} style={{ marginBottom: 2 }}>
                • {x.exercise_name} excluded ({LIMITATION_LABELS[x.limitation_tag as keyof typeof LIMITATION_LABELS] ?? x.limitation_tag}): {x.reason}
              </Text>
            ))}
          </View>
        )}

        {/* The safety line is the last thing a client reads and the only
            place the plan speaks directly to them, so it's worth getting
            right. "Stop any exercise that causes pain and tell your trainer"
            reads like a warning label; this frames the same instruction as
            normal coaching practice, which is what actually gets followed. */}
        <Text style={s.foot} fixed>
          Programmed by {brand.coachName}
          {brand.phone ? ` · ${brand.phone}` : ""}. This program was prepared for you individually.
          Discontinue any exercise that causes pain and let {brand.coachName.split(" ")[0]} know, so
          it can be adjusted.
        </Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

/**
 * Body measurement chart — a designed, fillable AcroForm PDF.
 *
 * This deliberately does NOT lay the document out in code. An earlier
 * version drew all 27 fields with manual pdf-lib x/y coordinate math,
 * which meant the design lived in two places (the designer's file and
 * ~120 lines of arithmetic) and drifted between them. Instead we ship the
 * real designed PDF as an asset and fill it, so what the client receives
 * is byte-for-byte the approved design.
 *
 * The client's name is pre-filled as a convenience; every field stays
 * editable so they can complete it on-screen in any standard PDF viewer
 * rather than printing it. Only field values are set — the page content
 * is never redrawn.
 */
export async function measurementChartToFillablePdf(clientName: string) {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const fs = await import("fs/promises");

  const templateBytes = await fs.readFile(MEASUREMENT_CHART_TEMPLATE);
  const pdfDoc = await PDFDocument.load(templateBytes);
  const form = pdfDoc.getForm();

  // getTextField throws if the field is absent or is a different widget
  // type. A branding refresh that reorders or renames fields shouldn't
  // 500 the download — the blank chart is still perfectly usable, so
  // degrade to an unfilled form and leave a breadcrumb in the logs.
  try {
    form.getTextField("client_name").setText(clientName);
  } catch {
    console.warn(
      "measurement-chart template: no 'client_name' text field — returning an unfilled chart. " +
        "Did public/measurement-chart-template.pdf change?"
    );
  }

  // Without this the value is stored but renders blank in viewers that
  // don't generate appearance streams themselves (notably Preview.app).
  const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
  form.updateFieldAppearances(helv);

  return pdfDoc.save();
}
