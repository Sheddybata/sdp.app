import { isAuthenticated } from "@/app/actions/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";
import { getElection } from "@/lib/db/elections";
import { RESULT_LEVEL_LABELS, raceLabel, type ResultLevel } from "@/lib/elections/shared";

export const dynamic = "force-dynamic";

function cell(v: unknown): string {
  const s = v == null ? "" : Array.isArray(v) ? v.join(" | ") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Streams every result of an election as CSV (one row per location, one column per party). */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  if (!(await isAuthenticated())) return new Response("Unauthorized", { status: 401 });
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) return new Response("Not found", { status: 404 });
  const election = await getElection(params.id);
  const supabase = createAdminClient();
  if (!election || !supabase) return new Response("Not found", { status: 404 });

  const header = [
    "Race",
    "Level",
    "Code",
    "State",
    "LGA",
    "Ward",
    "Polling unit",
    "Registered",
    "Accredited",
    ...election.parties,
    "Total valid",
    "Rejected",
    "Total cast",
    "Figures check",
    "Note",
    "Verified at",
    "Submitted by",
    "Phone",
    "Backup",
    "Version",
    "Latitude",
    "Longitude",
    "Photos",
    "Updated at",
  ];

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode(`\uFEFF${header.map(cell).join(",")}\r\n`));
      for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
        const { data, error } = await supabase
          .from("election_results")
          .select(
            "race,level,location_code,state_name,lga_name,ward_name,polling_unit_name,registered_voters,accredited_voters,party_votes,total_valid_votes,rejected_votes,total_votes_cast,discrepancies,note,verified_at,submitter_name,submitter_phone,is_backup,version,latitude,longitude,photo_paths,updated_at"
          )
          .eq("election_id", election.id)
          .order("race")
          .order("level")
          .order("location_code")
          .range(from, from + POSTGREST_PAGE_SIZE - 1);
        if (error) {
          console.error("[elections] export failed:", error);
          break;
        }
        const rows = (data ?? []) as Record<string, unknown>[];
        const lines = rows.map((r) => {
          const pv = (r.party_votes as Record<string, number>) ?? {};
          return [
            raceLabel(r.race as string),
            RESULT_LEVEL_LABELS[r.level as ResultLevel] ?? r.level,
            r.location_code,
            r.state_name,
            r.lga_name,
            r.ward_name,
            r.polling_unit_name,
            r.registered_voters,
            r.accredited_voters,
            ...election.parties.map((p) => pv[p] ?? 0),
            r.total_valid_votes,
            r.rejected_votes,
            r.total_votes_cast,
            ((r.discrepancies as string[]) ?? []).length ? (r.discrepancies as string[]) : "OK",
            r.note,
            r.verified_at,
            r.submitter_name,
            r.submitter_phone,
            r.is_backup ? "Yes" : "No",
            r.version,
            r.latitude,
            r.longitude,
            ((r.photo_paths as string[]) ?? []).length,
            r.updated_at,
          ]
            .map(cell)
            .join(",");
        });
        if (lines.length) controller.enqueue(encoder.encode(`${lines.join("\r\n")}\r\n`));
        if (rows.length < POSTGREST_PAGE_SIZE) break;
      }
      controller.close();
    },
  });

  const safeName = election.name.replace(/[^\w-]+/g, "-");
  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}-results.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
