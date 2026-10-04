"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { getPortalSession } from "@/app/actions/portalAuth";
import { AGENT_LEVEL_LABELS } from "@/lib/agent-registration-schema";
import {
  electionCoversState,
  findAgentTarget,
  getAgentElectionContext,
  type AgentElectionContext,
} from "@/lib/elections/agent-context";
import {
  getElection,
  getResultByLocation,
  insertCheckin,
  insertIncident,
  listCheckins,
  listElections,
  listIncidents,
  listResultSummariesForCodes,
  saveResult,
  signElectionPhotos,
  uploadElectionPhotoObject,
  type ResultRecord,
  type ResultSummary,
} from "@/lib/db/elections";
import {
  CHECKIN_STAGES,
  ELECTION_PHOTO_MAX_BYTES,
  INCIDENT_CATEGORIES,
  INCIDENT_MAX_PHOTOS,
  INCIDENT_SEVERITIES,
  RACE_IDS,
  RESULT_LEVEL_LABELS,
  RESULT_LEVELS,
  RESULT_MAX_PHOTOS,
  checkResultFigures,
  raceAllowsLevel,
  raceLabel,
  type CheckinStage,
  type Election,
  type ElectionActionResult,
  type Race,
  type ReportTarget,
  type ResultFigures,
} from "@/lib/elections/shared";

// ---------------------------------------------------------------- helpers

async function requireAgent(): Promise<
  { ok: true; userId: string; ctx: AgentElectionContext } | { ok: false; error: string; retry: false }
> {
  const session = await getPortalSession();
  if (!session.ok || session.role !== "agent") {
    return { ok: false, error: "Your session has expired. Sign in again.", retry: false };
  }
  const res = await getAgentElectionContext(session.userId);
  if (!res.ok) return { ok: false, error: res.error, retry: false };
  return { ok: true, userId: session.userId, ctx: res.ctx };
}

async function requireOpenElection(
  electionId: string,
  ctx: AgentElectionContext
): Promise<{ ok: true; election: Election } | { ok: false; error: string; retry: false }> {
  const election = await getElection(electionId);
  if (!election || election.status === "draft" || !electionCoversState(election, ctx.ownTarget.stateId)) {
    return { ok: false, error: "This election is not available for your location.", retry: false };
  }
  if (election.status !== "open") {
    return { ok: false, error: "Reporting for this election has closed.", retry: false };
  }
  return { ok: true, election };
}

/** Whether this agent may (re)submit the result at `target`, given what is already there. */
function resultPermission(
  target: ReportTarget,
  existing: Pick<ResultSummary, "submittedBy" | "submitterName"> | null,
  userId: string
): { canSubmit: boolean; reason?: string } {
  if (!existing || existing.submittedBy === userId) return { canSubmit: true };
  if (!target.isBackup) return { canSubmit: true };
  return {
    canSubmit: false,
    reason: `Already submitted by ${existing.submitterName}. Only the polling unit agent can change it.`,
  };
}

const optionalCoord = (min: number, max: number) => z.number().min(min).max(max).nullable().optional();

function ownPhotoPrefix(electionId: string, userId: string) {
  return `${electionId}/${userId}/`;
}

// ---------------------------------------------------------------- hub

export interface AgentResultStatus {
  target: ReportTarget;
  result: {
    submitterName: string;
    mine: boolean;
    isBackup: boolean;
    version: number;
    verified: boolean;
    discrepancyCount: number;
    updatedAt: string;
  } | null;
  canSubmit: boolean;
  blockedReason?: string;
}

export interface AgentRaceView {
  race: Race;
  /** Null when this race has no result at the agent's level (e.g. no state collation for Senate). */
  own: AgentResultStatus | null;
  backups: AgentResultStatus[];
}

export interface AgentElectionView {
  election: Election;
  races: AgentRaceView[];
  checkins: { stage: CheckinStage; at: string }[];
  incidents: { id: string; category: string; severity: string; occurredAt: string; status: string }[];
}

export interface AgentElectionHome {
  agent: { name: string; level: ReportTarget["level"]; levelLabel: string; postLabel: string; code: string; stateName: string };
  elections: AgentElectionView[];
}

export async function loadAgentElectionHome(): Promise<ElectionActionResult<{ home: AgentElectionHome }>> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  const { ctx, userId } = auth;

  const elections = (await listElections()).filter(
    (e) => e.status !== "draft" && electionCoversState(e, ctx.ownTarget.stateId)
  );
  const targets = [ctx.ownTarget, ...ctx.backupTargets];
  const codes = targets.map((t) => t.locationCode);

  const views = await Promise.all(
    elections.map(async (election): Promise<AgentElectionView> => {
      const [summaries, checkins, incidents] = await Promise.all([
        listResultSummariesForCodes(election.id, codes),
        listCheckins(election.id, { submittedBy: userId, limit: 50 }),
        listIncidents(election.id, { submittedBy: userId, limit: 50 }),
      ]);
      const byKey = new Map<string, ResultSummary>();
      for (const s of summaries) byKey.set(`${s.race}:${s.level}:${s.locationCode}`, s);
      const statusFor = (race: Race, t: ReportTarget): AgentResultStatus => {
        const s = byKey.get(`${race}:${t.level}:${t.locationCode}`) ?? null;
        const perm = resultPermission(t, s, userId);
        return {
          target: t,
          result: s
            ? {
                submitterName: s.submitterName,
                mine: s.submittedBy === userId,
                isBackup: s.isBackup,
                version: s.version,
                verified: Boolean(s.verifiedAt),
                discrepancyCount: s.discrepancyCount,
                updatedAt: s.updatedAt,
              }
            : null,
          canSubmit: election.status === "open" && perm.canSubmit,
          blockedReason: perm.reason,
        };
      };
      return {
        election,
        races: election.races.map((race) => ({
          race,
          own: raceAllowsLevel(race, ctx.ownTarget.level) ? statusFor(race, ctx.ownTarget) : null,
          backups: ctx.backupTargets.map((t) => statusFor(race, t)),
        })),
        checkins: checkins
          .filter((c) => c.locationCode === ctx.ownTarget.locationCode)
          .map((c) => ({ stage: c.stage, at: c.createdAt })),
        incidents: incidents.map((i) => ({
          id: i.id,
          category: i.category,
          severity: i.severity,
          occurredAt: i.occurredAt,
          status: i.status,
        })),
      };
    })
  );

  return {
    ok: true,
    home: {
      agent: {
        name: ctx.displayName,
        level: ctx.ownTarget.level,
        levelLabel: AGENT_LEVEL_LABELS[ctx.ownTarget.level],
        postLabel: ctx.ownTarget.label,
        code: ctx.ownTarget.locationCode,
        stateName: ctx.ownTarget.stateName,
      },
      elections: views,
    },
  };
}

/** Existing figures and photos so an agent can correct their submission. */
export async function getResultForEdit(args: {
  electionId: string;
  race: Race;
  level: string;
  locationCode: string;
}): Promise<
  ElectionActionResult<{ figures: ResultFigures; note: string | null; photos: { path: string; url: string }[] } | { figures: null }>
> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  const target = findAgentTarget(auth.ctx, args.level, args.locationCode);
  if (!target) return { ok: false, error: "This location is not part of your assignment.", retry: false };
  if (!RACE_IDS.includes(args.race)) return { ok: false, error: "Unknown race.", retry: false };
  const existing = await getResultByLocation(args.electionId, args.race, target.level, target.locationCode);
  if (!existing) return { ok: true, figures: null };
  const perm = resultPermission(target, existing, auth.userId);
  if (!perm.canSubmit) return { ok: false, error: perm.reason ?? "Not allowed.", retry: false };
  const urls = await signElectionPhotos(existing.photoPaths);
  return {
    ok: true,
    figures: {
      registeredVoters: existing.registeredVoters,
      accreditedVoters: existing.accreditedVoters,
      rejectedVotes: existing.rejectedVotes,
      totalValidVotes: existing.totalValidVotes,
      totalVotesCast: existing.totalVotesCast,
      partyVotes: existing.partyVotes,
    },
    note: existing.note,
    photos: existing.photoPaths.filter((p) => urls[p]).map((p) => ({ path: p, url: urls[p] })),
  };
}

// ---------------------------------------------------------------- photo upload

const DATA_URL_RE = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;

/** Uploads one compressed photo; call once per photo to stay under request limits. */
export async function uploadElectionPhoto(args: {
  electionId: string;
  dataUrl: string;
}): Promise<ElectionActionResult<{ path: string }>> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  if (typeof args.dataUrl !== "string" || typeof args.electionId !== "string") {
    return { ok: false, error: "Invalid photo.", retry: false };
  }
  const open = await requireOpenElection(args.electionId, auth.ctx);
  if (!open.ok) return open;

  const m = DATA_URL_RE.exec(args.dataUrl);
  if (!m) return { ok: false, error: "Photos must be JPEG, PNG or WebP images.", retry: false };
  const bytes = Buffer.from(m[2], "base64");
  if (bytes.length === 0 || bytes.length > ELECTION_PHOTO_MAX_BYTES) {
    return { ok: false, error: "Photo is too large. Retake it and try again.", retry: false };
  }
  const ext = m[1] === "jpeg" ? "jpg" : m[1];
  const path = `${ownPhotoPrefix(args.electionId, auth.userId)}${Date.now()}-${randomUUID()}.${ext}`;
  const ok = await uploadElectionPhotoObject(path, bytes, `image/${m[1]}`);
  if (!ok) return { ok: false, error: "Photo upload failed. It will be retried.", retry: true };
  return { ok: true, path };
}

// ---------------------------------------------------------------- results

const voteCount = z.number().int("Use whole numbers.").min(0).max(10_000_000);

const resultSchema = z.object({
  electionId: z.string().uuid(),
  /** Optional only for reports saved on phones before races existed; defaults to the first race. */
  race: z.enum(RACE_IDS).optional(),
  level: z.enum(RESULT_LEVELS),
  locationCode: z.string().min(1).max(40),
  registeredVoters: voteCount.nullable(),
  accreditedVoters: voteCount,
  rejectedVotes: voteCount,
  totalValidVotes: voteCount,
  totalVotesCast: voteCount,
  partyVotes: z.record(z.string(), voteCount),
  photoPaths: z.array(z.string().min(1).max(300)).max(RESULT_MAX_PHOTOS),
  note: z.string().max(2000).nullable().optional(),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
  locationAccuracyM: z.number().min(0).max(100_000).nullable().optional(),
  clientSubmissionId: z.string().max(80).nullable().optional(),
});
export type ResultSubmission = z.infer<typeof resultSchema>;

export async function submitElectionResult(
  input: ResultSubmission
): Promise<ElectionActionResult<{ version: number }>> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  const parsed = resultSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the figures.", retry: false };
  }
  const d = parsed.data;
  const open = await requireOpenElection(d.electionId, auth.ctx);
  if (!open.ok) return open;
  const { election } = open;

  const target = findAgentTarget(auth.ctx, d.level, d.locationCode);
  if (!target) return { ok: false, error: "This location is not part of your assignment.", retry: false };

  const race = d.race ?? election.races[0];
  if (!election.races.includes(race)) {
    return { ok: false, error: `${raceLabel(race)} is not on the ballot for this election.`, retry: false };
  }
  if (!raceAllowsLevel(race, target.level)) {
    return {
      ok: false,
      error: `There is no ${RESULT_LEVEL_LABELS[target.level].toLowerCase()} result for ${raceLabel(race)}.`,
      retry: false,
    };
  }

  const unknown = Object.keys(d.partyVotes).filter((p) => !election.parties.includes(p));
  if (unknown.length > 0) {
    return { ok: false, error: `Unknown party on this ballot: ${unknown.join(", ")}.`, retry: false };
  }
  const partyVotes: Record<string, number> = {};
  for (const p of election.parties) partyVotes[p] = d.partyVotes[p] ?? 0;

  const existing: ResultRecord | null = await getResultByLocation(
    d.electionId,
    race,
    target.level,
    target.locationCode
  );
  const perm = resultPermission(target, existing, auth.userId);
  if (!perm.canSubmit) return { ok: false, error: perm.reason ?? "Not allowed.", retry: false };

  const prefix = ownPhotoPrefix(d.electionId, auth.userId);
  const kept = new Set(existing?.photoPaths ?? []);
  const photoPaths = Array.from(new Set(d.photoPaths));
  if (photoPaths.length === 0) {
    return { ok: false, error: "Add at least one clear photo of the result sheet.", retry: false };
  }
  if (photoPaths.some((p) => !p.startsWith(prefix) && !kept.has(p))) {
    return { ok: false, error: "One of the photos could not be verified. Retake it.", retry: false };
  }

  const figures: ResultFigures = {
    registeredVoters: d.registeredVoters,
    accreditedVoters: d.accreditedVoters,
    rejectedVotes: d.rejectedVotes,
    totalValidVotes: d.totalValidVotes,
    totalVotesCast: d.totalVotesCast,
    partyVotes,
  };
  const discrepancies = checkResultFigures(figures);
  const note = d.note?.trim() || null;
  if (discrepancies.length > 0 && !note) {
    return {
      ok: false,
      error: "The figures don't add up. Check them against the sheet, or explain the difference in the note.",
      retry: false,
    };
  }

  const r = auth.ctx.registration;
  const saved = await saveResult(
    {
      ...figures,
      electionId: d.electionId,
      race,
      level: target.level,
      locationCode: target.locationCode,
      stateId: target.stateId,
      stateName: target.stateName,
      lgaId: target.lgaId,
      lgaName: target.lgaName,
      wardId: target.wardId,
      wardName: target.wardName,
      pollingUnitName: target.pollingUnitName,
      submittedBy: auth.userId,
      agentRegistrationId: r.id,
      submitterName: auth.ctx.displayName,
      submitterPhone: r.phone,
      isBackup: target.isBackup,
      photoPaths,
      note,
      discrepancies,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      locationAccuracyM: d.locationAccuracyM ?? null,
      clientSubmissionId: d.clientSubmissionId ?? null,
    },
    existing
  );
  if (!saved.ok) {
    return saved.conflict
      ? { ok: false, error: "Someone submitted this result at the same moment. Retrying…", retry: true }
      : { ok: false, error: "Could not save the result. It will be retried.", retry: true };
  }
  return { ok: true, version: saved.version };
}

// ---------------------------------------------------------------- incidents

const incidentSchema = z.object({
  electionId: z.string().uuid(),
  category: z.enum(INCIDENT_CATEGORIES.map((c) => c.id) as [string, ...string[]]),
  severity: z.enum(INCIDENT_SEVERITIES.map((s) => s.id) as ["low", "medium", "high"]),
  description: z
    .string()
    .trim()
    .min(10, "Describe what happened (at least 10 characters).")
    .max(2000, "Keep the description under 2,000 characters."),
  occurredAt: z.string().datetime({ offset: true }),
  photoPaths: z.array(z.string().min(1).max(300)).max(INCIDENT_MAX_PHOTOS),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
  clientSubmissionId: z.string().min(8).max(80),
});
export type IncidentSubmission = z.infer<typeof incidentSchema>;

export async function submitElectionIncident(input: IncidentSubmission): Promise<ElectionActionResult> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  const parsed = incidentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the report.", retry: false };
  }
  const d = parsed.data;
  const open = await requireOpenElection(d.electionId, auth.ctx);
  if (!open.ok) return open;

  const prefix = ownPhotoPrefix(d.electionId, auth.userId);
  if (d.photoPaths.some((p) => !p.startsWith(prefix))) {
    return { ok: false, error: "One of the photos could not be verified. Retake it.", retry: false };
  }
  if (new Date(d.occurredAt).getTime() > Date.now() + 10 * 60 * 1000) {
    return { ok: false, error: "The time of the incident is in the future.", retry: false };
  }

  const t = auth.ctx.ownTarget;
  const ok = await insertIncident({
    election_id: d.electionId,
    submitted_by: auth.userId,
    agent_registration_id: auth.ctx.registration.id,
    submitter_name: auth.ctx.displayName,
    submitter_phone: auth.ctx.registration.phone,
    level: t.level,
    location_code: t.locationCode,
    location_label: t.label,
    state_id: t.stateId,
    state_name: t.stateName,
    category: d.category,
    severity: d.severity,
    description: d.description,
    occurred_at: d.occurredAt,
    photo_paths: d.photoPaths,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
    client_submission_id: d.clientSubmissionId,
  });
  if (!ok) return { ok: false, error: "Could not save the report. It will be retried.", retry: true };
  return { ok: true };
}

// ---------------------------------------------------------------- check-ins

const checkinSchema = z.object({
  electionId: z.string().uuid(),
  stage: z.enum(CHECKIN_STAGES.map((s) => s.id) as [CheckinStage, ...CheckinStage[]]),
  latitude: optionalCoord(-90, 90),
  longitude: optionalCoord(-180, 180),
});
export type CheckinSubmission = z.infer<typeof checkinSchema>;

export async function submitElectionCheckin(input: CheckinSubmission): Promise<ElectionActionResult> {
  const auth = await requireAgent();
  if (!auth.ok) return auth;
  const parsed = checkinSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid check-in.", retry: false };
  const d = parsed.data;
  const open = await requireOpenElection(d.electionId, auth.ctx);
  if (!open.ok) return open;

  const t = auth.ctx.ownTarget;
  const ok = await insertCheckin({
    election_id: d.electionId,
    submitted_by: auth.userId,
    submitter_name: auth.ctx.displayName,
    level: t.level,
    location_code: t.locationCode,
    location_label: t.label,
    state_id: t.stateId,
    state_name: t.stateName,
    stage: d.stage,
    latitude: d.latitude ?? null,
    longitude: d.longitude ?? null,
  });
  if (!ok) return { ok: false, error: "Could not save the check-in. It will be retried.", retry: true };
  return { ok: true };
}
