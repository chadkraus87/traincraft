/** PDF renderer for workout plans · @react-pdf/renderer, server-side only. */
import React from "react";
import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Client, PlanJson } from "@/lib/types";
import { LIMITATION_LABELS } from "@/lib/safety/rules";

const s = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#16211B" },
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

export async function planToPdf(clientRow: Client, title: string, plan: PlanJson, weeks: number) {
  const doc = (
    <Document>
      <Page size="LETTER" style={s.page}>
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
          Programmed by your trainer with TrainCraft. Stop any exercise that causes pain and tell your trainer.
        </Text>
      </Page>
    </Document>
  );
  return renderToBuffer(doc);
}
