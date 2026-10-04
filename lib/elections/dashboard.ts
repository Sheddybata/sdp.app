import type { ComparisonRow, StateLevelTotals } from "@/lib/db/elections";
import type { StateLocationTotals } from "@/lib/location-codes";
import type { CheckinStage, ResultLevel } from "@/lib/elections/shared";

export type Progress = { required: number; reported: number };

export interface StateProgress {
  stateId: string;
  stateName: string;
  pollingUnits: Progress;
  wards: Progress;
  lgas: Progress;
  state: Progress;
  flagged: number;
  verified: number;
  totalResults: number;
  /** Sum of polling unit results. */
  puPartyVotes: Record<string, number>;
  /** Sum of the race's top-level collations in this state (state result, or LGA results for constituency races). */
  collationPartyVotes: Record<string, number> | null;
  checkins: Partial<Record<CheckinStage, number>>;
}

export type ComparisonStatus = "problem" | "match" | "partial";

export interface ComparisonView extends ComparisonRow {
  pusTotal: number;
  status: ComparisonStatus;
  /** Parties with fewer votes in the collation than in the polling unit results already in. */
  lost: string[];
  /** Parties with more votes in the collation than all polling units combined (only when every PU has reported). */
  added: string[];
  collationValid: number;
  puValid: number;
}

export interface NationalSummary {
  pollingUnits: Progress;
  wards: Progress;
  lgas: Progress;
  states: Progress;
  flagged: number;
  verified: number;
  totalResults: number;
  puPartyVotes: Record<string, number>;
  collationPartyVotes: Record<string, number>;
  checkins: Partial<Record<CheckinStage, number>>;
}

function addInto(target: Record<string, number>, src: Record<string, number>) {
  for (const k of Object.keys(src)) target[k] = (target[k] ?? 0) + (src[k] || 0);
}

function sum(m: Record<string, number>): number {
  let t = 0;
  for (const k of Object.keys(m)) t += m[k] || 0;
  return t;
}

export function buildStateProgress(
  locationTotals: StateLocationTotals[],
  scopeStateIds: string[] | null,
  totals: StateLevelTotals[],
  checkinCounts: { stateId: string; stage: CheckinStage; n: number }[],
  collationLevel: ResultLevel = "state"
): { states: StateProgress[]; national: NationalSummary } {
  const scope = scopeStateIds?.length ? new Set(scopeStateIds.map((s) => s.toLowerCase())) : null;
  const byState = new Map<string, Map<ResultLevel, StateLevelTotals>>();
  for (const t of totals) {
    const id = t.stateId.toLowerCase();
    let m = byState.get(id);
    if (!m) {
      m = new Map();
      byState.set(id, m);
    }
    m.set(t.level, t);
  }
  const checkinsByState = new Map<string, Partial<Record<CheckinStage, number>>>();
  for (const c of checkinCounts) {
    const id = c.stateId.toLowerCase();
    const m = checkinsByState.get(id) ?? {};
    m[c.stage] = (m[c.stage] ?? 0) + c.n;
    checkinsByState.set(id, m);
  }

  const national: NationalSummary = {
    pollingUnits: { required: 0, reported: 0 },
    wards: { required: 0, reported: 0 },
    lgas: { required: 0, reported: 0 },
    states: { required: 0, reported: 0 },
    flagged: 0,
    verified: 0,
    totalResults: 0,
    puPartyVotes: {},
    collationPartyVotes: {},
    checkins: {},
  };

  const states: StateProgress[] = locationTotals
    .filter((s) => !scope || scope.has(s.stateId))
    .map((s) => {
      const m = byState.get(s.stateId) ?? new Map<ResultLevel, StateLevelTotals>();
      const lv = (l: ResultLevel) => m.get(l);
      const reported = (l: ResultLevel) => lv(l)?.reported ?? 0;
      let flagged = 0;
      let verified = 0;
      let totalResults = 0;
      m.forEach((t) => {
        flagged += t.flagged;
        verified += t.verified;
        totalResults += t.reported;
      });
      const row: StateProgress = {
        stateId: s.stateId,
        stateName: s.stateName,
        pollingUnits: { required: s.lgas.reduce((a, l) => a + l.pollingUnits, 0), reported: reported("polling_unit") },
        wards: { required: s.lgas.reduce((a, l) => a + l.wards, 0), reported: reported("ward") },
        lgas: { required: s.lgas.length, reported: reported("lga") },
        state: { required: 1, reported: reported("state") },
        flagged,
        verified,
        totalResults,
        puPartyVotes: lv("polling_unit")?.partyVotes ?? {},
        collationPartyVotes: lv(collationLevel)?.partyVotes ?? null,
        checkins: checkinsByState.get(s.stateId) ?? {},
      };
      national.pollingUnits.required += row.pollingUnits.required;
      national.pollingUnits.reported += row.pollingUnits.reported;
      national.wards.required += row.wards.required;
      national.wards.reported += row.wards.reported;
      national.lgas.required += row.lgas.required;
      national.lgas.reported += row.lgas.reported;
      national.states.required += 1;
      national.states.reported += row.state.reported;
      national.flagged += flagged;
      national.verified += verified;
      national.totalResults += totalResults;
      addInto(national.puPartyVotes, row.puPartyVotes);
      if (row.collationPartyVotes) addInto(national.collationPartyVotes, row.collationPartyVotes);
      for (const k of Object.keys(row.checkins) as CheckinStage[]) {
        national.checkins[k] = (national.checkins[k] ?? 0) + (row.checkins[k] ?? 0);
      }
      return row;
    });

  return { states, national };
}

export function buildComparison(rows: ComparisonRow[], countPus: (code: string) => number): ComparisonView[] {
  return rows.map((r) => {
    const pusTotal = countPus(r.locationCode);
    const parties = Array.from(new Set([...Object.keys(r.collation), ...Object.keys(r.puTotals)]));
    const lost = parties.filter((p) => (r.collation[p] ?? 0) < (r.puTotals[p] ?? 0));
    const complete = pusTotal > 0 && r.pusReported >= pusTotal;
    const added = complete ? parties.filter((p) => (r.collation[p] ?? 0) > (r.puTotals[p] ?? 0)) : [];
    const status: ComparisonStatus = lost.length || added.length ? "problem" : complete ? "match" : "partial";
    return {
      ...r,
      pusTotal,
      status,
      lost,
      added,
      collationValid: sum(r.collation),
      puValid: sum(r.puTotals),
    };
  });
}

export function pctOf(p: Progress): number {
  if (!p.required) return 0;
  return Math.min(100, Math.round((p.reported / p.required) * 100));
}

export function rankParties(votes: Record<string, number>, parties: string[]): { party: string; votes: number }[] {
  const all = Array.from(new Set([...parties, ...Object.keys(votes)]));
  return all.map((party) => ({ party, votes: votes[party] ?? 0 })).sort((a, b) => b.votes - a.votes);
}
