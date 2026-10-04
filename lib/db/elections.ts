import { createAdminClient } from "@/lib/supabase/admin";
import { POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";
import type {
  CheckinStage,
  Election,
  ElectionStatus,
  IncidentSeverity,
  Race,
  ResultFigures,
  ResultLevel,
} from "@/lib/elections/shared";

export const ELECTION_BUCKET = "election-uploads";

type Row = Record<string, unknown>;

function rowToElection(r: Row): Election {
  return {
    id: r.id as string,
    name: r.name as string,
    races: ((r.races as Race[] | null) ?? [r.election_type as Race]).filter(Boolean),
    electionDate: r.election_date as string,
    parties: (r.parties as string[]) ?? [],
    stateIds: (r.state_ids as string[] | null) ?? null,
    status: r.status as ElectionStatus,
    createdAt: r.created_at as string,
  };
}

// ---------------------------------------------------------------- elections

export async function listElections(): Promise<Election[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("elections")
    .select("*")
    .order("election_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) {
    console.error("[elections] list failed:", error);
    return [];
  }
  return (data ?? []).map(rowToElection);
}

export async function getElection(id: string): Promise<Election | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("elections").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[elections] get failed:", error);
    return null;
  }
  return data ? rowToElection(data) : null;
}

export interface ElectionInput {
  name: string;
  races: Race[];
  electionDate: string;
  parties: string[];
  stateIds: string[] | null;
}

export async function createElection(input: ElectionInput): Promise<string | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("elections")
    .insert({
      name: input.name,
      races: input.races,
      election_type: input.races[0],
      election_date: input.electionDate,
      parties: input.parties,
      state_ids: input.stateIds,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[elections] create failed:", error);
    return null;
  }
  return data.id as string;
}

export async function updateElection(
  id: string,
  patch: Partial<ElectionInput> & { status?: ElectionStatus }
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const row: Row = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.races !== undefined) {
    row.races = patch.races;
    row.election_type = patch.races[0];
  }
  if (patch.electionDate !== undefined) row.election_date = patch.electionDate;
  if (patch.parties !== undefined) row.parties = patch.parties;
  if (patch.stateIds !== undefined) row.state_ids = patch.stateIds;
  if (patch.status !== undefined) row.status = patch.status;
  const { error } = await supabase.from("elections").update(row).eq("id", id);
  if (error) {
    console.error("[elections] update failed:", error);
    return false;
  }
  return true;
}

/** Result counts per race for one election. */
export async function countResultsByRace(electionId: string, races: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  const supabase = createAdminClient();
  if (!supabase) return out;
  await Promise.all(
    races.map(async (race) => {
      const { count } = await supabase
        .from("election_results")
        .select("id", { count: "exact", head: true })
        .eq("election_id", electionId)
        .eq("race", race);
      out[race] = count ?? 0;
    })
  );
  return out;
}

// ---------------------------------------------------------------- results

export interface ResultSummary {
  id: string;
  race: Race;
  level: ResultLevel;
  locationCode: string;
  submittedBy: string;
  submitterName: string;
  isBackup: boolean;
  version: number;
  verifiedAt: string | null;
  discrepancyCount: number;
  updatedAt: string;
}

const SUMMARY_COLUMNS =
  "id,race,level,location_code,submitted_by,submitter_name,is_backup,version,verified_at,discrepancies,updated_at";

function rowToSummary(r: Row): ResultSummary {
  return {
    id: r.id as string,
    race: r.race as Race,
    level: r.level as ResultLevel,
    locationCode: r.location_code as string,
    submittedBy: r.submitted_by as string,
    submitterName: r.submitter_name as string,
    isBackup: Boolean(r.is_backup),
    version: (r.version as number) ?? 1,
    verifiedAt: (r.verified_at as string | null) ?? null,
    discrepancyCount: ((r.discrepancies as string[]) ?? []).length,
    updatedAt: r.updated_at as string,
  };
}

export interface ResultRecord extends ResultSummary, ResultFigures {
  electionId: string;
  stateId: string;
  stateName: string;
  lgaId: string | null;
  lgaName: string | null;
  wardId: string | null;
  wardName: string | null;
  pollingUnitName: string | null;
  submitterPhone: string | null;
  agentRegistrationId: string | null;
  photoPaths: string[];
  note: string | null;
  discrepancies: string[];
  latitude: number | null;
  longitude: number | null;
  locationAccuracyM: number | null;
  verifiedNote: string | null;
  createdAt: string;
}

function rowToRecord(r: Row): ResultRecord {
  const num = (k: string) => (r[k] == null ? null : Number(r[k]));
  const partyVotes: Record<string, number> = {};
  const pv = (r.party_votes as Record<string, unknown>) ?? {};
  for (const k of Object.keys(pv)) partyVotes[k] = Number(pv[k]) || 0;
  return {
    ...rowToSummary(r),
    electionId: r.election_id as string,
    stateId: r.state_id as string,
    stateName: r.state_name as string,
    lgaId: (r.lga_id as string | null) ?? null,
    lgaName: (r.lga_name as string | null) ?? null,
    wardId: (r.ward_id as string | null) ?? null,
    wardName: (r.ward_name as string | null) ?? null,
    pollingUnitName: (r.polling_unit_name as string | null) ?? null,
    submitterPhone: (r.submitter_phone as string | null) ?? null,
    agentRegistrationId: (r.agent_registration_id as string | null) ?? null,
    registeredVoters: num("registered_voters"),
    accreditedVoters: Number(r.accredited_voters) || 0,
    rejectedVotes: Number(r.rejected_votes) || 0,
    totalValidVotes: Number(r.total_valid_votes) || 0,
    totalVotesCast: Number(r.total_votes_cast) || 0,
    partyVotes,
    photoPaths: (r.photo_paths as string[]) ?? [],
    note: (r.note as string | null) ?? null,
    discrepancies: (r.discrepancies as string[]) ?? [],
    latitude: num("latitude"),
    longitude: num("longitude"),
    locationAccuracyM: num("location_accuracy_m"),
    verifiedNote: (r.verified_note as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

export async function getResultByLocation(
  electionId: string,
  race: Race,
  level: ResultLevel,
  locationCode: string
): Promise<ResultRecord | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("election_results")
    .select("*")
    .eq("election_id", electionId)
    .eq("race", race)
    .eq("level", level)
    .eq("location_code", locationCode)
    .maybeSingle();
  if (error) {
    console.error("[elections] result by location failed:", error);
    return null;
  }
  return data ? rowToRecord(data) : null;
}

export async function getResultById(id: string): Promise<ResultRecord | null> {
  const supabase = createAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.from("election_results").select("*").eq("id", id).maybeSingle();
  if (error) {
    console.error("[elections] result by id failed:", error);
    return null;
  }
  return data ? rowToRecord(data) : null;
}

/** Status of results at the given locations (agent hub). */
export async function listResultSummariesForCodes(
  electionId: string,
  codes: string[]
): Promise<ResultSummary[]> {
  if (codes.length === 0) return [];
  const supabase = createAdminClient();
  if (!supabase) return [];
  const out: ResultSummary[] = [];
  for (let i = 0; i < codes.length; i += 200) {
    const { data, error } = await supabase
      .from("election_results")
      .select(SUMMARY_COLUMNS)
      .eq("election_id", electionId)
      .in("location_code", codes.slice(i, i + 200));
    if (error) {
      console.error("[elections] result summaries failed:", error);
      continue;
    }
    for (const r of data ?? []) out.push(rowToSummary(r as Row));
  }
  return out;
}

export interface ResultSaveInput extends ResultFigures {
  electionId: string;
  race: Race;
  level: ResultLevel;
  locationCode: string;
  stateId: string;
  stateName: string;
  lgaId: string | null;
  lgaName: string | null;
  wardId: string | null;
  wardName: string | null;
  pollingUnitName: string | null;
  submittedBy: string;
  agentRegistrationId: string;
  submitterName: string;
  submitterPhone: string | null;
  isBackup: boolean;
  photoPaths: string[];
  note: string | null;
  discrepancies: string[];
  latitude: number | null;
  longitude: number | null;
  locationAccuracyM: number | null;
  clientSubmissionId: string | null;
}

/** Insert or replace the result for a location, keeping every version for audit. */
export async function saveResult(
  input: ResultSaveInput,
  existing: ResultRecord | null
): Promise<{ ok: true; id: string; version: number } | { ok: false; conflict?: boolean }> {
  const supabase = createAdminClient();
  if (!supabase) return { ok: false };
  const now = new Date().toISOString();
  const row: Row = {
    election_id: input.electionId,
    race: input.race,
    level: input.level,
    location_code: input.locationCode,
    state_id: input.stateId,
    state_name: input.stateName,
    lga_id: input.lgaId,
    lga_name: input.lgaName,
    ward_id: input.wardId,
    ward_name: input.wardName,
    polling_unit_name: input.pollingUnitName,
    submitted_by: input.submittedBy,
    agent_registration_id: input.agentRegistrationId,
    submitter_name: input.submitterName,
    submitter_phone: input.submitterPhone,
    is_backup: input.isBackup,
    registered_voters: input.registeredVoters,
    accredited_voters: input.accreditedVoters,
    rejected_votes: input.rejectedVotes,
    total_valid_votes: input.totalValidVotes,
    total_votes_cast: input.totalVotesCast,
    party_votes: input.partyVotes,
    photo_paths: input.photoPaths,
    note: input.note,
    discrepancies: input.discrepancies,
    latitude: input.latitude,
    longitude: input.longitude,
    location_accuracy_m: input.locationAccuracyM,
    client_submission_id: input.clientSubmissionId,
    updated_at: now,
  };

  let id: string;
  let version: number;
  if (existing) {
    version = existing.version + 1;
    const { data, error } = await supabase
      .from("election_results")
      .update({ ...row, version, verified_at: null, verified_note: null })
      .eq("id", existing.id)
      .eq("version", existing.version)
      .select("id");
    if (error) {
      console.error("[elections] result update failed:", error);
      return { ok: false };
    }
    if (!data?.length) return { ok: false, conflict: true };
    id = existing.id;
  } else {
    version = 1;
    const { data, error } = await supabase
      .from("election_results")
      .insert({ ...row, version })
      .select("id")
      .single();
    if (error || !data) {
      if (error?.code === "23505") return { ok: false, conflict: true };
      console.error("[elections] result insert failed:", error);
      return { ok: false };
    }
    id = data.id as string;
  }

  const { error: vErr } = await supabase.from("election_result_versions").insert({
    result_id: id,
    version,
    submitted_by: input.submittedBy,
    snapshot: row,
  });
  if (vErr) console.error("[elections] version snapshot failed:", vErr);
  return { ok: true, id, version };
}

export interface ResultListFilters {
  electionId: string;
  race?: string | "all";
  level?: ResultLevel | "all";
  stateId?: string | "all";
  only?: "all" | "flagged" | "unverified" | "verified" | "backup";
  search?: string;
  page: number;
  pageSize: number;
}

export async function adminListResults(
  f: ResultListFilters
): Promise<{ rows: ResultRecord[]; total: number }> {
  const supabase = createAdminClient();
  if (!supabase) return { rows: [], total: 0 };
  let q = supabase
    .from("election_results")
    .select(
      "id,election_id,race,level,location_code,state_id,state_name,lga_id,lga_name,ward_id,ward_name,polling_unit_name,submitted_by,submitter_name,submitter_phone,agent_registration_id,is_backup,registered_voters,accredited_voters,rejected_votes,total_valid_votes,total_votes_cast,party_votes,photo_paths,note,discrepancies,latitude,longitude,location_accuracy_m,verified_at,verified_note,version,created_at,updated_at",
      { count: "exact" }
    )
    .eq("election_id", f.electionId);
  if (f.race && f.race !== "all") q = q.eq("race", f.race);
  if (f.level && f.level !== "all") q = q.eq("level", f.level);
  if (f.stateId && f.stateId !== "all") q = q.eq("state_id", f.stateId);
  if (f.only === "flagged") q = q.neq("discrepancies", "{}");
  if (f.only === "unverified") q = q.is("verified_at", null);
  if (f.only === "verified") q = q.not("verified_at", "is", null);
  if (f.only === "backup") q = q.eq("is_backup", true);
  const s = f.search?.trim().replace(/[,()%*]/g, " ").trim();
  if (s) {
    const like = `%${s}%`;
    q = q.or(
      [
        `location_code.ilike.${like}`,
        `polling_unit_name.ilike.${like}`,
        `ward_name.ilike.${like}`,
        `lga_name.ilike.${like}`,
        `submitter_name.ilike.${like}`,
      ].join(",")
    );
  }
  const from = f.page * f.pageSize;
  const { data, error, count } = await q
    .order("updated_at", { ascending: false })
    .range(from, from + f.pageSize - 1);
  if (error) {
    console.error("[elections] admin list results failed:", error);
    return { rows: [], total: 0 };
  }
  return { rows: (data ?? []).map((r) => rowToRecord(r as Row)), total: count ?? 0 };
}

export interface ResultVersion {
  version: number;
  createdAt: string;
  submitterName: string;
  figures: ResultFigures;
  photoCount: number;
  note: string | null;
}

export async function listResultVersions(resultId: string): Promise<ResultVersion[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("election_result_versions")
    .select("version,created_at,snapshot")
    .eq("result_id", resultId)
    .order("version", { ascending: false });
  if (error) {
    console.error("[elections] versions failed:", error);
    return [];
  }
  return (data ?? []).map((v) => {
    const s = (v.snapshot ?? {}) as Row;
    const pv = (s.party_votes as Record<string, unknown>) ?? {};
    const partyVotes: Record<string, number> = {};
    for (const k of Object.keys(pv)) partyVotes[k] = Number(pv[k]) || 0;
    return {
      version: v.version as number,
      createdAt: v.created_at as string,
      submitterName: (s.submitter_name as string) ?? "",
      figures: {
        registeredVoters: s.registered_voters == null ? null : Number(s.registered_voters),
        accreditedVoters: Number(s.accredited_voters) || 0,
        rejectedVotes: Number(s.rejected_votes) || 0,
        totalValidVotes: Number(s.total_valid_votes) || 0,
        totalVotesCast: Number(s.total_votes_cast) || 0,
        partyVotes,
      },
      photoCount: ((s.photo_paths as string[]) ?? []).length,
      note: (s.note as string | null) ?? null,
    };
  });
}

export async function setResultVerified(id: string, verified: boolean, note: string | null): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("election_results")
    .update({
      verified_at: verified ? new Date().toISOString() : null,
      verified_note: verified ? note : null,
    })
    .eq("id", id);
  if (error) {
    console.error("[elections] verify failed:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- aggregates

export interface StateLevelTotals {
  stateId: string;
  level: ResultLevel;
  reported: number;
  flagged: number;
  verified: number;
  partyVotes: Record<string, number>;
}

function numMap(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  const o = (v as Record<string, unknown>) ?? {};
  for (const k of Object.keys(o)) out[k] = Number(o[k]) || 0;
  return out;
}

export async function getStateTotals(electionId: string, race: Race): Promise<StateLevelTotals[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("election_state_totals", { eid: electionId, p_race: race });
  if (error) {
    console.error("[elections] state totals failed:", error);
    return [];
  }
  return ((data ?? []) as Row[]).map((r) => ({
    stateId: r.state_id as string,
    level: r.level as ResultLevel,
    reported: Number(r.reported) || 0,
    flagged: Number(r.flagged) || 0,
    verified: Number(r.verified) || 0,
    partyVotes: numMap(r.party_votes),
  }));
}

export interface ComparisonRow {
  resultId: string;
  level: Exclude<ResultLevel, "polling_unit">;
  locationCode: string;
  stateId: string;
  stateName: string;
  lgaName: string | null;
  wardName: string | null;
  collation: Record<string, number>;
  puTotals: Record<string, number>;
  pusReported: number;
}

export async function getComparison(electionId: string, race: Race): Promise<ComparisonRow[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const acc: ComparisonRow[] = [];
  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    const { data, error } = await supabase
      .rpc("election_comparison", { eid: electionId, p_race: race })
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) {
      console.error("[elections] comparison failed:", error);
      break;
    }
    const rows = (data ?? []) as Row[];
    for (const r of rows) {
      acc.push({
        resultId: r.result_id as string,
        level: r.level as ComparisonRow["level"],
        locationCode: r.location_code as string,
        stateId: r.state_id as string,
        stateName: r.state_name as string,
        lgaName: (r.lga_name as string | null) ?? null,
        wardName: (r.ward_name as string | null) ?? null,
        collation: numMap(r.collation),
        puTotals: numMap(r.pu_totals),
        pusReported: Number(r.pus_reported) || 0,
      });
    }
    if (rows.length < POSTGREST_PAGE_SIZE) break;
  }
  return acc;
}

export async function getCheckinCounts(
  electionId: string
): Promise<{ stateId: string; stage: CheckinStage; n: number }[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("election_checkin_counts", { eid: electionId });
  if (error) {
    console.error("[elections] checkin counts failed:", error);
    return [];
  }
  return ((data ?? []) as Row[]).map((r) => ({
    stateId: r.state_id as string,
    stage: r.stage as CheckinStage,
    n: Number(r.n) || 0,
  }));
}

// ---------------------------------------------------------------- incidents

export interface IncidentRecord {
  id: string;
  electionId: string;
  submittedBy: string;
  submitterName: string;
  submitterPhone: string | null;
  level: string;
  locationCode: string;
  locationLabel: string;
  stateId: string;
  stateName: string;
  category: string;
  severity: IncidentSeverity;
  description: string;
  occurredAt: string;
  photoPaths: string[];
  latitude: number | null;
  longitude: number | null;
  status: "open" | "resolved";
  createdAt: string;
}

function rowToIncident(r: Row): IncidentRecord {
  return {
    id: r.id as string,
    electionId: r.election_id as string,
    submittedBy: r.submitted_by as string,
    submitterName: r.submitter_name as string,
    submitterPhone: (r.submitter_phone as string | null) ?? null,
    level: r.level as string,
    locationCode: r.location_code as string,
    locationLabel: r.location_label as string,
    stateId: r.state_id as string,
    stateName: r.state_name as string,
    category: r.category as string,
    severity: r.severity as IncidentSeverity,
    description: r.description as string,
    occurredAt: r.occurred_at as string,
    photoPaths: (r.photo_paths as string[]) ?? [],
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    status: r.status as "open" | "resolved",
    createdAt: r.created_at as string,
  };
}

export async function insertIncident(row: {
  election_id: string;
  submitted_by: string;
  agent_registration_id: string;
  submitter_name: string;
  submitter_phone: string | null;
  level: string;
  location_code: string;
  location_label: string;
  state_id: string;
  state_name: string;
  category: string;
  severity: IncidentSeverity;
  description: string;
  occurred_at: string;
  photo_paths: string[];
  latitude: number | null;
  longitude: number | null;
  client_submission_id: string;
}): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("election_incidents")
    .upsert(row, { onConflict: "client_submission_id", ignoreDuplicates: true });
  if (error) {
    console.error("[elections] incident insert failed:", error);
    return false;
  }
  return true;
}

export async function listIncidents(
  electionId: string,
  opts: { submittedBy?: string; limit?: number } = {}
): Promise<IncidentRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  let q = supabase.from("election_incidents").select("*").eq("election_id", electionId);
  if (opts.submittedBy) q = q.eq("submitted_by", opts.submittedBy);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 1000);
  if (error) {
    console.error("[elections] incidents list failed:", error);
    return [];
  }
  return (data ?? []).map((r) => rowToIncident(r as Row));
}

export async function setIncidentStatus(id: string, status: "open" | "resolved"): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.from("election_incidents").update({ status }).eq("id", id);
  if (error) {
    console.error("[elections] incident status failed:", error);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------- check-ins

export interface CheckinRecord {
  stage: CheckinStage;
  locationCode: string;
  locationLabel: string;
  stateName: string;
  submitterName: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export async function insertCheckin(row: {
  election_id: string;
  submitted_by: string;
  submitter_name: string;
  level: string;
  location_code: string;
  location_label: string;
  state_id: string;
  state_name: string;
  stage: CheckinStage;
  latitude: number | null;
  longitude: number | null;
}): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.from("election_checkins").upsert(row, {
    onConflict: "election_id,submitted_by,location_code,stage",
    ignoreDuplicates: true,
  });
  if (error) {
    console.error("[elections] check-in failed:", error);
    return false;
  }
  return true;
}

export async function listCheckins(
  electionId: string,
  opts: { submittedBy?: string; limit?: number } = {}
): Promise<CheckinRecord[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  let q = supabase.from("election_checkins").select("*").eq("election_id", electionId);
  if (opts.submittedBy) q = q.eq("submitted_by", opts.submittedBy);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(opts.limit ?? 300);
  if (error) {
    console.error("[elections] check-ins list failed:", error);
    return [];
  }
  return (data ?? []).map((r) => ({
    stage: r.stage as CheckinStage,
    locationCode: r.location_code as string,
    locationLabel: r.location_label as string,
    stateName: r.state_name as string,
    submitterName: r.submitter_name as string,
    latitude: r.latitude == null ? null : Number(r.latitude),
    longitude: r.longitude == null ? null : Number(r.longitude),
    createdAt: r.created_at as string,
  }));
}

// ---------------------------------------------------------------- photos

export async function uploadElectionPhotoObject(
  objectPath: string,
  bytes: Buffer,
  contentType: string
): Promise<boolean> {
  const supabase = createAdminClient();
  if (!supabase) return false;
  const { error } = await supabase.storage
    .from(ELECTION_BUCKET)
    .upload(objectPath, bytes, { contentType, upsert: false });
  if (error) {
    console.error("[elections] photo upload failed:", error);
    return false;
  }
  return true;
}

/** Short-lived links for admins to view private photos. */
export async function signElectionPhotos(paths: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  if (paths.length === 0) return out;
  const supabase = createAdminClient();
  if (!supabase) return out;
  const { data, error } = await supabase.storage.from(ELECTION_BUCKET).createSignedUrls(paths, 60 * 60);
  if (error) {
    console.error("[elections] sign photos failed:", error);
    return out;
  }
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) out[item.path] = item.signedUrl;
  }
  return out;
}
