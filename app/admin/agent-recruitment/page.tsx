import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { listRecruitmentOfficers, getAroRegistrationStats } from "@/lib/db/agent-recruitment";
import { listStateRecruitmentCodes } from "@/lib/db/agent-state-recruitment";
import { AdminAgentRecruitmentClient } from "./AdminAgentRecruitmentClient";

export const dynamic = "force-dynamic";

export default async function AdminAgentRecruitmentPage() {
  const authed = await isAuthenticated();
  if (!authed) redirect("/admin/login");

  const [officers, stateCodes, stats] = await Promise.all([
    listRecruitmentOfficers(),
    listStateRecruitmentCodes(),
    getAroRegistrationStats(),
  ]);
  return (
    <AdminAgentRecruitmentClient
      initialOfficers={officers}
      initialStateCodes={stateCodes}
      initialStats={stats}
    />
  );
}
