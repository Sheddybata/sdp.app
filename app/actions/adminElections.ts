"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isAuthenticated } from "@/app/actions/auth";
import {
  adminListResults,
  countResultsByRace,
  createElection,
  getElection,
  getResultById,
  listResultVersions,
  setIncidentStatus,
  setResultVerified,
  signElectionPhotos,
  updateElection,
  type ResultListFilters,
  type ResultRecord,
  type ResultVersion,
} from "@/lib/db/elections";
import { getLocationTotals } from "@/lib/location-codes";
import { ELECTION_STATUSES, RACE_IDS, RESULT_LEVELS, raceLabel, type ElectionStatus } from "@/lib/elections/shared";

type Res<T = object> = ({ ok: true } & T) | { ok: false; error: string };

const electionSchema = z.object({
  name: z.string().trim().min(3, "Enter a name for the election.").max(120),
  races: z.array(z.enum(RACE_IDS)).min(1, "Tick at least one race on the ballot."),
  electionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose the election date."),
  parties: z
    .array(z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{1,12}$/, "Party acronyms use letters, numbers or -."))
    .min(2, "Add at least two parties.")
    .max(40),
  stateIds: z.array(z.string().min(1)).nullable(),
});
export type ElectionFormInput = z.input<typeof electionSchema>;

function parseElection(input: ElectionFormInput) {
  const parsed = electionSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const d = parsed.data;
  const parties = Array.from(new Set(d.parties));
  let stateIds: string[] | null = null;
  if (d.stateIds && d.stateIds.length > 0) {
    const known = new Set(getLocationTotals().map((s) => s.stateId));
    const ids = Array.from(new Set(d.stateIds.map((s) => s.toLowerCase())));
    if (ids.some((s) => !known.has(s))) return { ok: false as const, error: "Unknown state selected." };
    stateIds = ids;
  }
  return {
    ok: true as const,
    value: {
      name: d.name,
      races: RACE_IDS.filter((r) => d.races.includes(r)),
      electionDate: d.electionDate,
      parties,
      stateIds,
    },
  };
}

export async function adminCreateElection(input: ElectionFormInput): Promise<Res<{ id: string }>> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  const p = parseElection(input);
  if (!p.ok) return p;
  const id = await createElection(p.value);
  if (!id) return { ok: false, error: "Could not create the election. Has migration 018 been run?" };
  revalidatePath("/admin/elections");
  return { ok: true, id };
}

export async function adminUpdateElection(id: string, input: ElectionFormInput): Promise<Res> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  const p = parseElection(input);
  if (!p.ok) return p;
  const current = await getElection(id);
  if (!current) return { ok: false, error: "Election not found." };
  if (current.status === "locked") return { ok: false, error: "This election is locked." };
  const byRace = await countResultsByRace(id, current.races);
  const hasResults = Object.values(byRace).some((n) => n > 0);
  const partiesChanged = current.parties.join(",") !== p.value.parties.join(",");
  if (hasResults && partiesChanged) {
    return { ok: false, error: "Results have already been submitted, so the party list can no longer change." };
  }
  const removedWithResults = current.races.filter((r) => !p.value.races.includes(r) && (byRace[r] ?? 0) > 0);
  if (removedWithResults.length > 0) {
    return {
      ok: false,
      error: `${removedWithResults.map(raceLabel).join(", ")} already has results, so it can't be removed.`,
    };
  }
  const ok = await updateElection(id, p.value);
  if (!ok) return { ok: false, error: "Could not save the election." };
  revalidatePath("/admin/elections");
  revalidatePath(`/admin/elections/${id}`);
  return { ok: true };
}

export async function adminSetElectionStatus(id: string, status: ElectionStatus): Promise<Res> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  if (!ELECTION_STATUSES.some((s) => s.id === status)) return { ok: false, error: "Invalid status." };
  const current = await getElection(id);
  if (!current) return { ok: false, error: "Election not found." };
  if (current.status === "locked") return { ok: false, error: "This election is locked and final." };
  const ok = await updateElection(id, { status });
  if (!ok) return { ok: false, error: "Could not change the status." };
  revalidatePath("/admin/elections");
  revalidatePath(`/admin/elections/${id}`);
  return { ok: true };
}

const listSchema = z.object({
  electionId: z.string().uuid(),
  race: z.enum([...RACE_IDS, "all"]).optional(),
  level: z.enum([...RESULT_LEVELS, "all"]).optional(),
  stateId: z.string().max(60).optional(),
  only: z.enum(["all", "flagged", "unverified", "verified", "backup"]).optional(),
  search: z.string().max(100).optional(),
  page: z.number().int().min(0).max(100_000),
});

export async function adminListElectionResults(
  input: Omit<ResultListFilters, "pageSize">
): Promise<Res<{ rows: ResultRecord[]; total: number; pageSize: number }>> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  const parsed = listSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid filters." };
  const pageSize = 50;
  const { rows, total } = await adminListResults({ ...parsed.data, pageSize });
  return { ok: true, rows, total, pageSize };
}

export async function adminGetResultDetail(
  id: string
): Promise<Res<{ result: ResultRecord; photoUrls: Record<string, string>; versions: ResultVersion[] }>> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid result." };
  const result = await getResultById(id);
  if (!result) return { ok: false, error: "Result not found." };
  const [photoUrls, versions] = await Promise.all([signElectionPhotos(result.photoPaths), listResultVersions(id)]);
  return { ok: true, result, photoUrls, versions };
}

export async function adminVerifyResult(id: string, verified: boolean, note?: string): Promise<Res> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid result." };
  const ok = await setResultVerified(id, verified, note?.trim().slice(0, 500) || null);
  return ok ? { ok: true } : { ok: false, error: "Could not update the result." };
}

export async function adminSignElectionPhotos(paths: string[]): Promise<Record<string, string>> {
  if (!(await isAuthenticated())) return {};
  if (!Array.isArray(paths)) return {};
  return signElectionPhotos(paths.filter((p) => typeof p === "string").slice(0, 50));
}

export async function adminSetIncidentStatus(id: string, status: "open" | "resolved"): Promise<Res> {
  if (!(await isAuthenticated())) return { ok: false, error: "Unauthorized." };
  if (!z.string().uuid().safeParse(id).success || (status !== "open" && status !== "resolved")) {
    return { ok: false, error: "Invalid request." };
  }
  const ok = await setIncidentStatus(id, status);
  return ok ? { ok: true } : { ok: false, error: "Could not update the incident." };
}
