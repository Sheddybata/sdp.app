/** Election-day types, labels and result checks shared by the agent app, admin and server actions. */

export const ELECTION_TYPES = [
  { id: "presidential", label: "Presidential" },
  { id: "senate", label: "Senate" },
  { id: "house_of_reps", label: "House of Representatives" },
  { id: "governorship", label: "Governorship" },
  { id: "state_assembly", label: "State House of Assembly" },
  { id: "lg_chairman", label: "Local Government Chairman" },
  { id: "councillor", label: "Councillorship" },
  { id: "other", label: "Other" },
] as const;
export type ElectionType = (typeof ELECTION_TYPES)[number]["id"];
/** A race on the ballot (one election day can hold several). */
export type Race = ElectionType;
export const RACE_IDS = ELECTION_TYPES.map((t) => t.id) as [Race, ...Race[]];

/** Races INEC holds on the same day. */
export const ELECTION_PRESETS: { id: string; label: string; races: Race[] }[] = [
  { id: "national", label: "Presidential & National Assembly", races: ["presidential", "senate", "house_of_reps"] },
  { id: "state", label: "Governorship & State House of Assembly", races: ["governorship", "state_assembly"] },
  { id: "local", label: "Local government (Chairman & Councillors)", races: ["lg_chairman", "councillor"] },
];

export const ELECTION_STATUSES = [
  { id: "draft", label: "Draft", hint: "Being set up — agents cannot see it yet." },
  { id: "open", label: "Open", hint: "Agents can submit results, incidents and check-ins." },
  { id: "closed", label: "Closed", hint: "Reporting has ended. Agents can view but not submit." },
  { id: "locked", label: "Locked", hint: "Final. No further changes by anyone." },
] as const;
export type ElectionStatus = (typeof ELECTION_STATUSES)[number]["id"];

/** INEC-registered parties (2023 general elections), used as the default ballot. */
export const DEFAULT_PARTIES = [
  "SDP", "A", "AA", "AAC", "ADC", "ADP", "APC", "APGA", "APM",
  "APP", "BP", "LP", "NNPP", "NRM", "PDP", "PRP", "YPP", "ZLP",
];

export const RESULT_LEVELS = ["polling_unit", "ward", "lga", "state"] as const;
export type ResultLevel = (typeof RESULT_LEVELS)[number];

export const RESULT_LEVEL_LABELS: Record<ResultLevel, string> = {
  polling_unit: "Polling unit",
  ward: "Ward collation",
  lga: "LGA collation",
  state: "State collation",
};

/**
 * Highest level our agents collate for each race. Senate, House of Reps and State Assembly
 * are declared at constituency level, so the last collation we track is the LGA.
 */
export const RACE_TOP_LEVEL: Record<Race, ResultLevel> = {
  presidential: "state",
  governorship: "state",
  senate: "lga",
  house_of_reps: "lga",
  state_assembly: "lga",
  lg_chairman: "lga",
  councillor: "ward",
  other: "state",
};

export function raceAllowsLevel(race: Race, level: ResultLevel): boolean {
  return RESULT_LEVELS.indexOf(level) <= RESULT_LEVELS.indexOf(RACE_TOP_LEVEL[race]);
}

export function raceLabel(race: string): string {
  return ELECTION_TYPES.find((t) => t.id === race)?.label ?? race;
}

export function racesLabel(races: string[]): string {
  return races.map(raceLabel).join(" · ");
}

/** Name of the official result form at each level. */
export const RESULT_FORM_NAMES: Record<ResultLevel, string> = {
  polling_unit: "Form EC8A",
  ward: "Form EC8B",
  lga: "Form EC8C",
  state: "Form EC8D",
};

export const INCIDENT_CATEGORIES = [
  { id: "violence", label: "Violence or threats" },
  { id: "ballot_snatching", label: "Ballot box snatching" },
  { id: "vote_buying", label: "Vote buying" },
  { id: "intimidation", label: "Voter or agent intimidation" },
  { id: "late_materials", label: "Late or missing materials" },
  { id: "bvas_failure", label: "BVAS / device failure" },
  { id: "underage_voting", label: "Underage or unregistered voting" },
  { id: "result_manipulation", label: "Result alteration or manipulation" },
  { id: "agent_denied", label: "Agent denied access" },
  { id: "other", label: "Other" },
] as const;
export type IncidentCategory = (typeof INCIDENT_CATEGORIES)[number]["id"];

export const INCIDENT_SEVERITIES = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High — urgent" },
] as const;
export type IncidentSeverity = (typeof INCIDENT_SEVERITIES)[number]["id"];

export const CHECKIN_STAGES = [
  { id: "arrived", label: "Arrived at my post" },
  { id: "accreditation_started", label: "Accreditation / voting started" },
  { id: "voting_ended", label: "Voting ended" },
  { id: "counting_done", label: "Counting / collation done" },
] as const;
export type CheckinStage = (typeof CHECKIN_STAGES)[number]["id"];

export const RESULT_MAX_PHOTOS = 6;
export const INCIDENT_MAX_PHOTOS = 4;
/** Decoded size limit per uploaded photo. */
export const ELECTION_PHOTO_MAX_BYTES = 2 * 1024 * 1024;

export function labelFor<T extends { id: string; label: string }>(list: readonly T[], id: string): string {
  return list.find((x) => x.id === id)?.label ?? id;
}

export interface Election {
  id: string;
  name: string;
  /** Races on the ballot this day, in display order. */
  races: Race[];
  electionDate: string;
  parties: string[];
  /** Null = nationwide. */
  stateIds: string[] | null;
  status: ElectionStatus;
  createdAt: string;
}

export interface ResultFigures {
  registeredVoters: number | null;
  accreditedVoters: number;
  rejectedVotes: number;
  totalValidVotes: number;
  totalVotesCast: number;
  partyVotes: Record<string, number>;
}

/** A location an agent can report a result for. */
export interface ReportTarget {
  level: ResultLevel;
  locationCode: string;
  label: string;
  stateId: string;
  stateName: string;
  lgaId: string | null;
  lgaName: string | null;
  wardId: string | null;
  wardName: string | null;
  pollingUnitName: string | null;
  /** Ward agent reporting one of the ward's polling units. */
  isBackup: boolean;
}

export function sumPartyVotes(partyVotes: Record<string, number>): number {
  let total = 0;
  for (const k of Object.keys(partyVotes)) total += partyVotes[k] || 0;
  return total;
}

const fmt = (n: number) => n.toLocaleString("en-NG");

/** Plain-language problems with the typed figures; empty when everything adds up. */
export function checkResultFigures(f: ResultFigures): string[] {
  const issues: string[] = [];
  const partySum = sumPartyVotes(f.partyVotes);
  if (partySum !== f.totalValidVotes) {
    issues.push(
      `Party votes add up to ${fmt(partySum)}, but total valid votes is ${fmt(f.totalValidVotes)}.`
    );
  }
  if (f.totalValidVotes + f.rejectedVotes !== f.totalVotesCast) {
    issues.push(
      `Valid votes (${fmt(f.totalValidVotes)}) + rejected votes (${fmt(f.rejectedVotes)}) = ${fmt(
        f.totalValidVotes + f.rejectedVotes
      )}, but total votes cast is ${fmt(f.totalVotesCast)}.`
    );
  }
  if (f.totalVotesCast > f.accreditedVoters) {
    issues.push(
      `Total votes cast (${fmt(f.totalVotesCast)}) is more than accredited voters (${fmt(f.accreditedVoters)}).`
    );
  }
  if (f.registeredVoters != null && f.accreditedVoters > f.registeredVoters) {
    issues.push(
      `Accredited voters (${fmt(f.accreditedVoters)}) is more than registered voters (${fmt(f.registeredVoters)}).`
    );
  }
  return issues;
}

export type ElectionActionResult<T = object> =
  | ({ ok: true } & T)
  | { ok: false; error: string; /** false = fix the input; retrying will not help. */ retry?: boolean };
