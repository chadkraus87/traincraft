/**
 * GET /api/clients/[id]/measurement-chart/pdf · generates a blank,
 * printable body-measurement chart for a client, branded the same as
 * workout plan PDFs. Not tied to any stored data — this is deliberately
 * a static, print-and-fill-by-hand document, not an interactive form
 * (the PDF library this app uses, @react-pdf/renderer, generates flat
 * PDFs only; true fillable form fields would need a different library).
 */
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { measurementChartToFillablePdf } from "@/lib/pdf";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: client } = await supabase.from("clients").select("full_name").eq("id", id).single();
  if (!client) return NextResponse.json({ error: "Client not found" }, { status: 404 });

  const buffer = await measurementChartToFillablePdf(client.full_name);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${client.full_name} - Measurement Chart.pdf"`,
    },
  });
}
