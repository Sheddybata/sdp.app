import { getMembers } from "@/lib/db/members";
import { AdminDashboardClient } from "./AdminDashboardClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const members = await getMembers();
  return <AdminDashboardClient members={members} />;
}
