import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { listAgentRegistrations } from "@/lib/db/agent-registrations";
import { getLocationTotals } from "@/lib/location-codes";
import { computeAgentCoverage } from "@/lib/agent-coverage";
import {
  listFederalConstituencies,
  listSenatorialDistricts,
  listStateAssemblyConstituencies,
  listUnmappedConstituencies,
} from "@/lib/constituency-data";
import { AgentCoverageClient } from "./AgentCoverageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AgentCoveragePage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const [agents, totals] = await Promise.all([
    listAgentRegistrations(),
    Promise.resolve().then(() => {
      try {
        return getLocationTotals();
      } catch (err) {
        console.error("[ADMIN] agent coverage: location totals unavailable:", err);
        return [];
      }
    }),
  ]);

  const seatTotals = {
    senatorial: listSenatorialDistricts().length,
    federal: listFederalConstituencies().length,
    stateAssembly: listStateAssemblyConstituencies().length,
    unmapped: listUnmappedConstituencies().length,
  };

  const report = computeAgentCoverage(totals, agents, seatTotals);
  return <AgentCoverageClient report={report} generatedAt={new Date().toISOString()} />;
}
