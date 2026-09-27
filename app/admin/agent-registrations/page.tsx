import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { listAgentRegistrations } from "@/lib/db/agent-registrations";
import { AdminAgentRegistrationsClient } from "./AdminAgentRegistrationsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminAgentRegistrationsPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const registrations = await listAgentRegistrations();
  return <AdminAgentRegistrationsClient initialRegistrations={registrations} />;
}
