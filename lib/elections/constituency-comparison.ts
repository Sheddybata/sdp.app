import {
  getConstituencyLink,
  listFederalConstituencies,
  listSenatorialDistricts,
  listStateAssemblyConstituencies,
} from "@/lib/constituency-data";
import { countPollingUnitsUnder } from "@/lib/location-codes";
import type { ComparisonRow } from "@/lib/db/elections";
import { createAdminClient } from "@/lib/supabase/admin";
import { POSTGREST_PAGE_SIZE } from "@/lib/db/admin-list-limits";
import type { Race, ResultLevel } from "@/lib/elections/shared";

const CONSTITUENCY_LEVELS: ResultLevel[] = [
  "senatorial",
  "federal_constituency",
  "state_constituency",
  "national",
];

function addVotes(into: Record<string, number>, src: Record<string, number>) {
  for (const k of Object.keys(src)) into[k] = (into[k] ?? 0) + (src[k] || 0);
}

/** Expected PU count under an INEC admin code or a constituency / NATIONAL code. */
export function countPollingUnitsForLocationCode(code: string): number {
  const c = code.trim();
  if (!c) return 0;
  if (c.toUpperCase() === "NATIONAL") {
    const states = new Set<string>();
    for (const seat of listSenatorialDistricts()) {
      const sc = getConstituencyLink(seat.code)?.wards?.[0]?.stateCode;
      if (sc) states.add(sc);
    }
    let n = 0;
    Array.from(states).forEach((sc) => {
      n += countPollingUnitsUnder(sc);
    });
    return n;
  }
  const link = getConstituencyLink(c);
  if (link?.wards?.length) {
    return link.wards.reduce((a, w) => a + (w.puCount || 0), 0);
  }
  try {
    return countPollingUnitsUnder(c);
  } catch {
    return 0;
  }
}

async function loadPuPartyVotes(
  electionId: string,
  race: Race
): Promise<{ locationCode: string; partyVotes: Record<string, number> }[]> {
  const supabase = createAdminClient();
  if (!supabase) return [];
  const out: { locationCode: string; partyVotes: Record<string, number> }[] = [];
  for (let from = 0; ; from += POSTGREST_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("election_results")
      .select("location_code,party_votes")
      .eq("election_id", electionId)
      .eq("race", race)
      .eq("level", "polling_unit")
      .range(from, from + POSTGREST_PAGE_SIZE - 1);
    if (error) {
      console.error("[elections] load PU votes for constituency compare failed:", error);
      break;
    }
    const rows = data ?? [];
    for (const r of rows) {
      const pv = (r.party_votes as Record<string, number>) ?? {};
      const nums: Record<string, number> = {};
      for (const [k, v] of Object.entries(pv)) nums[k] = Number(v) || 0;
      out.push({ locationCode: r.location_code as string, partyVotes: nums });
    }
    if (rows.length < POSTGREST_PAGE_SIZE) break;
  }
  return out;
}

function wardPrefixesForCode(code: string): string[] {
  if (code.toUpperCase() === "NATIONAL") return []; // handled separately
  const link = getConstituencyLink(code);
  if (!link?.wards?.length) return [];
  return link.wards.map((w) => w.locationCode);
}

/**
 * SQL comparison only rolls PU totals into state/LGA/ward codes.
 * Recompute PU sums for constituency / national collation rows using extracted links.
 */
export async function enrichConstituencyComparison(
  electionId: string,
  race: Race,
  rows: ComparisonRow[]
): Promise<ComparisonRow[]> {
  const needs = rows.filter((r) => CONSTITUENCY_LEVELS.includes(r.level));
  if (!needs.length) return rows;

  const pus = await loadPuPartyVotes(electionId, race);

  return rows.map((r) => {
    if (!CONSTITUENCY_LEVELS.includes(r.level)) return r;

    let prefixes = wardPrefixesForCode(r.locationCode);
    if (r.level === "national" || r.locationCode.toUpperCase() === "NATIONAL") {
      // All wards linked from every senatorial district (covers the federation once per LGA set)
      const seen = new Set<string>();
      prefixes = [];
      for (const seat of listSenatorialDistricts()) {
        for (const w of getConstituencyLink(seat.code)?.wards ?? []) {
          if (!seen.has(w.locationCode)) {
            seen.add(w.locationCode);
            prefixes.push(w.locationCode);
          }
        }
      }
    }

    if (!prefixes.length) return r;

    const puTotals: Record<string, number> = {};
    let pusReported = 0;
    for (const pu of pus) {
      if (prefixes.some((p) => pu.locationCode === p || pu.locationCode.startsWith(p + "/"))) {
        addVotes(puTotals, pu.partyVotes);
        pusReported += 1;
      }
    }

    return { ...r, puTotals, pusReported };
  });
}

export function constituencySeatCounts() {
  return {
    senatorial: listSenatorialDistricts().length,
    federal: listFederalConstituencies().length,
    stateAssembly: listStateAssemblyConstituencies().length,
    national: 1,
  };
}
