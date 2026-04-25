import { NextRequest, NextResponse } from "next/server";
import { getMembersForInecExport } from "@/lib/db/members";
import { buildInecRegisterZipBuffer } from "@/lib/inec-register-export";

export const runtime = "nodejs";

function deriveLabelDates(
  members: { createdAt?: string }[],
  dateFrom?: string,
  dateTo?: string
): { from: string; to: string } {
  const days = members
    .map((m) => (m.createdAt ? m.createdAt.slice(0, 10) : ""))
    .filter(Boolean) as string[];
  days.sort();
  const minD = days[0];
  const maxD = days[days.length - 1];
  const today = new Date().toISOString().slice(0, 10);
  return {
    from: dateFrom?.trim() || minD || today,
    to: dateTo?.trim() || maxD || today,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      search?: string;
      state?: string;
      lga?: string;
      ward?: string;
      dateFrom?: string;
      dateTo?: string;
      batchNum?: number;
    };

    const batchNum = Math.max(1, Math.floor(Number(body.batchNum) || 1));

    const { members, error: loadError } = await getMembersForInecExport({
      search: body.search?.trim() || undefined,
      state: body.state?.trim() || undefined,
      lga: body.lga?.trim() || undefined,
      ward: body.ward?.trim() || undefined,
      dateFrom: body.dateFrom?.trim() || undefined,
      dateTo: body.dateTo?.trim() || undefined,
    });

    if (loadError) {
      return NextResponse.json({ error: loadError }, { status: 500 });
    }

    if (members.length === 0) {
      return NextResponse.json(
        {
          error:
            "No members match the current filters (or the database is empty). Tip: clear Registered from/to if you meant to export everyone; dates filter by portal registration time (created_at), not party join date.",
        },
        { status: 400 }
      );
    }

    const { from: dateFromIso, to: dateToIso } = deriveLabelDates(
      members,
      body.dateFrom,
      body.dateTo
    );

    const { buffer, filename } = await buildInecRegisterZipBuffer(members, {
      batchNum,
      dateFromIso,
      dateToIso,
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename.replace(/"/g, "")}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
