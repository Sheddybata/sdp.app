import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { countResultsByRace, listElections } from "@/lib/db/elections";
import { getLocationTotals } from "@/lib/location-codes";
import { ElectionsAdminClient } from "./ElectionsAdminClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminElectionsPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }
  const elections = await listElections();
  const counts: Record<string, Record<string, number>> = {};
  await Promise.all(
    elections.map(async (e) => {
      counts[e.id] = await countResultsByRace(e.id, e.races);
    })
  );
  let states: { id: string; name: string }[] = [];
  try {
    states = getLocationTotals().map((s) => ({ id: s.stateId, name: s.stateName }));
  } catch (err) {
    console.error("[ADMIN] elections: location totals unavailable:", err);
  }
  return <ElectionsAdminClient elections={elections} resultCounts={counts} states={states} />;
}
