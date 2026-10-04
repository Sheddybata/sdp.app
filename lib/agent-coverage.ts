import type { AgentLevel } from "@/lib/agent-registration-schema";
import type { PortalUserStatus } from "@/lib/db/agent-registrations";
import type { StateLocationTotals } from "@/lib/location-codes";

/**
 * A post is "filled" when at least one approved agent holds it, and "pending" when it has
 * only agents awaiting review. Extra agents on the same post do not raise coverage.
 */
export type CoverageCounts = { required: number; filled: number; pending: number };

export type LgaCoverage = {
  lgaId: string;
  lgaName: string;
  lga: CoverageCounts;
  wards: CoverageCounts;
  pollingUnits: CoverageCounts;
};

export type StateCoverage = {
  stateId: string;
  stateName: string;
  state: CoverageCounts;
  lgas: CoverageCounts;
  wards: CoverageCounts;
  pollingUnits: CoverageCounts;
  approvedAgents: number;
  pendingAgents: number;
  /** Average of the four level percentages (each level weighs the same). */
  overallPct: number;
  lgaBreakdown: LgaCoverage[];
};

export type AgentCoverageReport = {
  states: StateCoverage[];
  national: {
    state: CoverageCounts;
    lgas: CoverageCounts;
    wards: CoverageCounts;
    pollingUnits: CoverageCounts;
    approvedAgents: number;
    pendingAgents: number;
    completeStates: number;
  };
};

export type CoverageAgent = {
  status: PortalUserStatus;
  agentLevel: AgentLevel;
  assignedStateId: string;
  assignedLgaId: string | null;
  assignedWardId: string | null;
  assignedPollingUnitName: string | null;
  assignedCode: string | null;
};

export function pct(c: CoverageCounts): number {
  return c.required ? Math.round((Math.min(c.filled, c.required) / c.required) * 1000) / 10 : 100;
}

export function isComplete(c: CoverageCounts): boolean {
  return c.filled >= c.required;
}

const lc = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

function postKey(a: CoverageAgent): string | null {
  const s = lc(a.assignedStateId);
  if (!s) return null;
  if (a.agentLevel === "state") return s;
  const l = lc(a.assignedLgaId);
  if (!l) return null;
  if (a.agentLevel === "lga") return `${s}|${l}`;
  const w = lc(a.assignedWardId);
  if (!w) return null;
  if (a.agentLevel === "ward") return `${s}|${l}|${w}`;
  const pu = lc(a.assignedCode) || lc(a.assignedPollingUnitName);
  return pu ? `${s}|${l}|${w}|${pu}` : null;
}

const empty = (required: number): CoverageCounts => ({ required, filled: 0, pending: 0 });

function add(into: CoverageCounts, from: CoverageCounts) {
  into.required += from.required;
  into.filled += from.filled;
  into.pending += from.pending;
}

export function computeAgentCoverage(totals: StateLocationTotals[], agents: CoverageAgent[]): AgentCoverageReport {
  const approvedPosts: Record<AgentLevel, Set<string>> = {
    state: new Set(),
    lga: new Set(),
    ward: new Set(),
    polling_unit: new Set(),
  };
  const pendingPosts: Record<AgentLevel, Set<string>> = {
    state: new Set(),
    lga: new Set(),
    ward: new Set(),
    polling_unit: new Set(),
  };
  const agentsByState = new Map<string, { approved: number; pending: number }>();

  for (const a of agents) {
    if (a.status === "rejected") continue;
    const key = postKey(a);
    if (!key) continue;
    (a.status === "approved" ? approvedPosts : pendingPosts)[a.agentLevel].add(key);
    const s = lc(a.assignedStateId);
    const tally = agentsByState.get(s) ?? { approved: 0, pending: 0 };
    if (a.status === "approved") tally.approved += 1;
    else tally.pending += 1;
    agentsByState.set(s, tally);
  }

  /** Ward / polling-unit posts grouped by their "state|lga" key, in one pass. */
  const byLga = (level: "ward" | "polling_unit") => {
    const out = new Map<string, { filled: number; pending: number }>();
    const bump = (key: string, field: "filled" | "pending") => {
      const lgaKey = key.split("|").slice(0, 2).join("|");
      const t = out.get(lgaKey) ?? { filled: 0, pending: 0 };
      t[field] += 1;
      out.set(lgaKey, t);
    };
    approvedPosts[level].forEach((k) => bump(k, "filled"));
    pendingPosts[level].forEach((k) => {
      if (!approvedPosts[level].has(k)) bump(k, "pending");
    });
    return out;
  };
  const wardsByLga = byLga("ward");
  const pusByLga = byLga("polling_unit");
  const tallyUnder = (map: Map<string, { filled: number; pending: number }>, lgaKey: string) =>
    map.get(lgaKey) ?? { filled: 0, pending: 0 };

  const national = {
    state: empty(0),
    lgas: empty(0),
    wards: empty(0),
    pollingUnits: empty(0),
    approvedAgents: 0,
    pendingAgents: 0,
    completeStates: 0,
  };

  const states: StateCoverage[] = totals.map((t) => {
    const s = lc(t.stateId);
    const lgaBreakdown: LgaCoverage[] = t.lgas.map((l) => {
      const prefix = `${s}|${lc(l.lgaId)}`;
      const lgaFilled = approvedPosts.lga.has(prefix);
      const lgaPending = !lgaFilled && pendingPosts.lga.has(prefix);
      return {
        lgaId: l.lgaId,
        lgaName: l.lgaName,
        lga: { required: 1, filled: lgaFilled ? 1 : 0, pending: lgaPending ? 1 : 0 },
        wards: { required: l.wards, ...tallyUnder(wardsByLga, prefix) },
        pollingUnits: { required: l.pollingUnits, ...tallyUnder(pusByLga, prefix) },
      };
    });

    const stateFilled = approvedPosts.state.has(s);
    const state: CoverageCounts = {
      required: 1,
      filled: stateFilled ? 1 : 0,
      pending: !stateFilled && pendingPosts.state.has(s) ? 1 : 0,
    };
    const lgas = empty(0);
    const wards = empty(0);
    const pollingUnits = empty(0);
    for (const l of lgaBreakdown) {
      add(lgas, l.lga);
      add(wards, l.wards);
      add(pollingUnits, l.pollingUnits);
    }
    const counts = agentsByState.get(s) ?? { approved: 0, pending: 0 };
    const overallPct = Math.round(((pct(state) + pct(lgas) + pct(wards) + pct(pollingUnits)) / 4) * 10) / 10;

    add(national.state, state);
    add(national.lgas, lgas);
    add(national.wards, wards);
    add(national.pollingUnits, pollingUnits);
    national.approvedAgents += counts.approved;
    national.pendingAgents += counts.pending;
    if ([state, lgas, wards, pollingUnits].every(isComplete)) national.completeStates += 1;

    return {
      stateId: t.stateId,
      stateName: t.stateName,
      state,
      lgas,
      wards,
      pollingUnits,
      approvedAgents: counts.approved,
      pendingAgents: counts.pending,
      overallPct,
      lgaBreakdown,
    };
  });

  return { states, national };
}
