import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import {
  countResultsByRace,
  getCheckinCounts,
  getComparison,
  getElection,
  getStateTotals,
  listCheckins,
  listIncidents,
} from "@/lib/db/elections";
import { countPollingUnitsUnder, getLocationTotals, type StateLocationTotals } from "@/lib/location-codes";
import { buildComparison, buildStateProgress } from "@/lib/elections/dashboard";
import { RACE_TOP_LEVEL, type Race } from "@/lib/elections/shared";
import { ElectionDashboardClient } from "./ElectionDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ElectionDashboardPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { race?: string };
}) {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
  if (!/^[0-9a-f-]{36}$/i.test(params.id)) notFound();
  const election = await getElection(params.id);
  if (!election) notFound();
  const race: Race = election.races.find((r) => r === searchParams.race) ?? election.races[0];

  let locationTotals: StateLocationTotals[] = [];
  try {
    locationTotals = getLocationTotals();
  } catch (err) {
    console.error("[ADMIN] election dashboard: location totals unavailable:", err);
  }

  const [stateTotals, comparisonRows, checkinCounts, incidents, recentCheckins, raceCounts] = await Promise.all([
    getStateTotals(election.id, race),
    getComparison(election.id, race),
    getCheckinCounts(election.id),
    listIncidents(election.id, { limit: 1000 }),
    listCheckins(election.id, { limit: 200 }),
    countResultsByRace(election.id, election.races),
  ]);

  const { states, national } = buildStateProgress(
    locationTotals,
    election.stateIds,
    stateTotals,
    checkinCounts,
    RACE_TOP_LEVEL[race]
  );
  const comparison = buildComparison(comparisonRows, (code) => {
    try {
      return countPollingUnitsUnder(code);
    } catch {
      return 0;
    }
  });

  return (
    <ElectionDashboardClient
      election={election}
      race={race}
      raceCounts={raceCounts}
      states={states}
      national={national}
      comparison={comparison}
      incidents={incidents}
      recentCheckins={recentCheckins}
      generatedAt={new Date().toISOString()}
    />
  );
}
