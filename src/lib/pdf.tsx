/** PDF renderer for workout plans · @react-pdf/renderer, server-side only. */
import React from "react";
import path from "path";
import { Document, Page, Text, View, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Client, PlanJson } from "@/lib/types";
import { LIMITATION_LABELS } from "@/lib/safety/rules";

// The logo's own background is solid black (no transparency), so rather
// than trying to fake a blend onto the white page, it sits in a header
// band that matches — reads as an intentional brand block, not an
// artifact.
const LOGO_PATH = path.join(process.cwd(), "public", "chad-kraus-logo.png");

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

  // Measurement chart — matches a supplied reference design: black header
  // with an accent bar below, black section headers with an orange
  // left-edge tab and a small green dot, two/three-column bordered
  // fill-in fields.
  mcHeader: { backgroundColor: "#000000", paddingVertical: 18, paddingHorizontal: 36, flexDirection: "row", alignItems: "center", gap: 14 },
  mcAccentBar: { height: 4, backgroundColor: "#4C9A2A" },
  mcTitle: { color: "#F7F0E6", fontSize: 20, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  mcCreds: { color: "#EC6B3A", fontSize: 11, fontFamily: "Helvetica-Bold", marginTop: 3, letterSpacing: 0.5 },
  mcTagline: { color: "#CFCABF", fontSize: 8, marginTop: 3 },
  mcSection: { backgroundColor: "#000000", flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6, paddingHorizontal: 10, marginTop: 16, marginBottom: 10, borderLeftWidth: 4, borderLeftColor: "#EC6B3A" },
  mcSectionTitle: { color: "#FFFFFF", fontSize: 10, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  mcDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4C9A2A" },
  mcGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mcField: { borderWidth: 1, borderColor: "#CCC", padding: 6, height: 34, justifyContent: "flex-start" },
  mcFieldLabel: { fontSize: 8, fontFamily: "Helvetica-Bold" },
  mcFieldValue: { fontSize: 10, marginTop: 3 },
  mcWideField: { borderWidth: 1, borderColor: "#CCC", padding: 6, height: 44, marginBottom: 4 },
  mcNotesBox: { borderWidth: 1, borderColor: "#CCC", height: 130 },
  mcFoot: { position: "absolute", bottom: 24, left: 36, right: 36, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  mcFootLeft: { fontSize: 7, color: "#999", width: "60%" },
  mcFootRight: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#EC6B3A" },
});

interface MCField { label: string; value?: string; }

function MeasurementField({ field, widthPct }: { field: MCField; widthPct: number }) {
  return (
    <View style={[s.mcField, { width: `${widthPct}%` }]}>
      <Text style={s.mcFieldLabel}>{field.label}:</Text>
      {field.value ? <Text style={s.mcFieldValue}>{field.value}</Text> : null}
    </View>
  );
}

function MeasurementSection({ title, fields, cols }: { title: string; fields: MCField[]; cols: number }) {
  const widthPct = 100 / cols - 1.5;
  return (
    <View wrap={false}>
      <View style={s.mcSection}>
        <Text style={s.mcSectionTitle}>{title}</Text>
        <View style={s.mcDot} />
      </View>
      <View style={s.mcGrid}>
        {fields.map((f) => <MeasurementField key={f.label} field={f} widthPct={widthPct} />)}
      </View>
    </View>
  );
}

export async function measurementChartToPdf(clientName: string) {
  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.mcHeader} fixed>
          <Image src={LOGO_PATH} style={s.logo} />
          <View>
            <Text style={s.mcTitle}>BODY MEASUREMENT CHART</Text>
            <Text style={s.mcCreds}>CHAD KRAUS  |  CPT | PES | CNC | VCS</Text>
            <Text style={s.mcTagline}>Client assessment and progress tracking</Text>
          </View>
        </View>
        <View style={s.mcAccentBar} fixed />

        <View style={s.body}>
          <MeasurementSection
            title="CLIENT INFORMATION"
            cols={2}
            fields={[
              { label: "Client name", value: clientName },
              { label: "Date of birth" },
              { label: "Phone / email" },
              { label: "Assessment date" },
              { label: "Sex" },
              { label: "Coach", value: "Chad Kraus" },
            ]}
          />
          <View style={s.mcWideField}>
            <Text style={s.mcFieldLabel}>Relevant medical history / considerations:</Text>
          </View>

          <MeasurementSection
            title="BODY COMPOSITION"
            cols={3}
            fields={[
              { label: "Height" }, { label: "Weight" }, { label: "BMI" },
              { label: "Body fat %" }, { label: "Lean mass" }, { label: "Resting heart rate" },
            ]}
          />

          <MeasurementSection
            title="BODY CIRCUMFERENCE"
            cols={2}
            fields={[
              { label: "Neck" }, { label: "Mid upper arm" },
              { label: "Chest / bust" }, { label: "Hip" },
              { label: "Waist" }, { label: "Mid-thigh" },
              { label: "Abdomen" }, { label: "Calf" },
            ]}
          />

          <MeasurementSection
            title="SKINFOLD MEASUREMENTS"
            cols={2}
            fields={[
              { label: "Biceps" }, { label: "Triceps" },
              { label: "Iliac crest" }, { label: "Thigh" },
              { label: "Abdomen" }, { label: "Subscapular" },
              { label: "Chest" }, { label: "Calf" },
            ]}
          />

          <View wrap={false}>
            <View style={s.mcSection}>
              <Text style={s.mcSectionTitle}>ASSESSMENT NOTES AND GOALS</Text>
              <View style={s.mcDot} />
            </View>
            <View style={s.mcNotesBox} />
          </View>
        </View>

        <View style={s.mcFoot} fixed>
          <Text style={s.mcFootLeft}>Measurements should be taken consistently using the same method, equipment, and conditions.</Text>
          <Text style={s.mcFootRight}>CHAD KRAUS FITNESS COACHING</Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

export async function planToPdf(clientRow: Client, title: string, plan: PlanJson, weeks: number) {
  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
        <View style={s.header} fixed>
          <Image src={LOGO_PATH} style={s.logo} />
          <View style={s.headerText}>
            <Text style={s.headerBrand}>CHAD KRAUS</Text>
            <Text style={s.headerCreds}>CPT | PES | CNC | VCS</Text>
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

        <Text style={s.foot} fixed>
          Programmed by Chad Kraus. Stop any exercise that causes pain and tell your trainer.
        </Text>
        </View>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}

/**
 * True fillable-form version of the measurement chart, using pdf-lib
 * instead of @react-pdf/renderer. This is a genuinely different approach
 * from every other PDF in the app: @react-pdf/renderer (used everywhere
 * else) only produces flat, static PDFs — it has no concept of an
 * interactive AcroForm field. pdf-lib does, so this is the one place in
 * the codebase using it. Every field below is a real clickable/typeable
 * form field, not just a bordered box with a blank line — a client can
 * open this in any standard PDF viewer, click into a field, and type.
 * Layout here is manual (x/y coordinates, bottom-left origin) since
 * pdf-lib has no flexbox-like layout system the way react-pdf does.
 */
export async function measurementChartToFillablePdf(clientName: string) {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const fs = await import("fs/promises");

  const pdfDoc = await PDFDocument.create();
  const form = pdfDoc.getForm();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const logoBytes = await fs.readFile(LOGO_PATH);
  const logoImage = await pdfDoc.embedPng(logoBytes);

  const PAGE_W = 612, PAGE_H = 792, MARGIN = 36;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BLACK = rgb(0, 0, 0);
  const WHITE = rgb(1, 1, 1);
  const ORANGE = rgb(0.925, 0.42, 0.23); // #EC6B3A
  const GREEN = rgb(0.298, 0.604, 0.165); // #4C9A2A
  const BORDER_GRAY = rgb(0.8, 0.8, 0.8);
  const LABEL_GRAY = rgb(0.15, 0.15, 0.15);
  const MUTED = rgb(0.55, 0.55, 0.55);

  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let fieldCounter = 0;

  // Header band
  const HEADER_H = 92;
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H, width: PAGE_W, height: HEADER_H, color: BLACK });
  const logoSize = 60;
  page.drawImage(logoImage, { x: MARGIN, y: PAGE_H - HEADER_H + (HEADER_H - logoSize) / 2, width: logoSize, height: logoSize });
  const textX = MARGIN + logoSize + 14;
  page.drawText("BODY MEASUREMENT CHART", { x: textX, y: PAGE_H - 34, size: 18, font: boldFont, color: WHITE });
  page.drawText("CHAD KRAUS  |  CPT | PES | CNC | VCS", { x: textX, y: PAGE_H - 52, size: 10, font: boldFont, color: ORANGE });
  page.drawText("Client assessment and progress tracking", { x: textX, y: PAGE_H - 66, size: 8, font, color: rgb(0.85, 0.85, 0.85) });
  // Accent bar
  page.drawRectangle({ x: 0, y: PAGE_H - HEADER_H - 4, width: PAGE_W, height: 4, color: GREEN });

  let cursorY = PAGE_H - HEADER_H - 4 - 24;

  function sectionHeader(title: string) {
    const h = 20;
    page.drawRectangle({ x: MARGIN, y: cursorY - h, width: CONTENT_W, height: h, color: BLACK });
    page.drawRectangle({ x: MARGIN, y: cursorY - h, width: 4, height: h, color: ORANGE });
    page.drawText(title, { x: MARGIN + 12, y: cursorY - h + 6, size: 9, font: boldFont, color: WHITE });
    page.drawCircle({ x: MARGIN + CONTENT_W - 12, y: cursorY - h / 2, size: 3, color: GREEN });
    cursorY -= h + 10;
  }

  function fieldGrid(labels: (string | { label: string; value?: string })[], cols: number, rowHeight = 32) {
    const gap = 8;
    const fieldW = (CONTENT_W - gap * (cols - 1)) / cols;
    const rows = Math.ceil(labels.length / cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= labels.length) continue;
        const item = labels[idx];
        const label = typeof item === "string" ? item : item.label;
        const value = typeof item === "string" ? undefined : item.value;
        const x = MARGIN + c * (fieldW + gap);
        const y = cursorY - r * (rowHeight + 6);
        page.drawRectangle({ x, y: y - rowHeight, width: fieldW, height: rowHeight, borderColor: BORDER_GRAY, borderWidth: 1 });
        page.drawText(`${label}:`, { x: x + 6, y: y - 12, size: 8, font: boldFont, color: LABEL_GRAY });
        const tf = form.createTextField(`field_${fieldCounter++}_${label.replace(/[^a-zA-Z0-9]/g, "_")}`);
        if (value) tf.setText(value);
        tf.addToPage(page, {
          x: x + 6, y: y - rowHeight + 5, width: fieldW - 12, height: 14,
          borderWidth: 0, font, textColor: BLACK,
        });
      }
    }
    cursorY -= rows * (rowHeight + 6) + 14;
  }

  function wideField(label: string, height = 36) {
    page.drawRectangle({ x: MARGIN, y: cursorY - height, width: CONTENT_W, height, borderColor: BORDER_GRAY, borderWidth: 1 });
    page.drawText(`${label}:`, { x: MARGIN + 6, y: cursorY - 12, size: 8, font: boldFont, color: LABEL_GRAY });
    const tf = form.createTextField(`field_${fieldCounter++}_${label.replace(/[^a-zA-Z0-9]/g, "_")}`);
    tf.addToPage(page, { x: MARGIN + 6, y: cursorY - height + 5, width: CONTENT_W - 12, height: height - 20, borderWidth: 0, font, textColor: BLACK });
    cursorY -= height + 14;
  }

  sectionHeader("CLIENT INFORMATION");
  fieldGrid([
    { label: "Client name", value: clientName },
    { label: "Date of birth" },
    { label: "Phone / email" },
    { label: "Assessment date" },
    { label: "Sex" },
    { label: "Coach", value: "Chad Kraus" },
  ], 2);
  wideField("Relevant medical history / considerations");

  sectionHeader("BODY COMPOSITION");
  fieldGrid(["Height", "Weight", "BMI", "Body fat %", "Lean mass", "Resting heart rate"], 3);

  sectionHeader("BODY CIRCUMFERENCE");
  fieldGrid(["Neck", "Mid upper arm", "Chest / bust", "Hip", "Waist", "Mid-thigh", "Abdomen", "Calf"], 2);

  sectionHeader("SKINFOLD MEASUREMENTS");
  fieldGrid(["Biceps", "Triceps", "Iliac crest", "Thigh", "Abdomen", "Subscapular", "Chest", "Calf"], 2);

  sectionHeader("ASSESSMENT NOTES AND GOALS");
  const notesH = 130;
  page.drawRectangle({ x: MARGIN, y: cursorY - notesH, width: CONTENT_W, height: notesH, borderColor: BORDER_GRAY, borderWidth: 1 });
  const notesField = form.createTextField("field_notes");
  notesField.enableMultiline();
  notesField.addToPage(page, { x: MARGIN + 6, y: cursorY - notesH + 6, width: CONTENT_W - 12, height: notesH - 12, borderWidth: 0, font, textColor: BLACK });

  // Footer
  page.drawText("Measurements should be taken consistently using the same method, equipment, and conditions.", {
    x: MARGIN, y: 24, size: 7, font, color: MUTED, maxWidth: CONTENT_W * 0.6,
  });
  page.drawText("CHAD KRAUS FITNESS COACHING", {
    x: PAGE_W - MARGIN - boldFont.widthOfTextAtSize("CHAD KRAUS FITNESS COACHING", 8),
    y: 24, size: 8, font: boldFont, color: ORANGE,
  });

  return pdfDoc.save();
}
