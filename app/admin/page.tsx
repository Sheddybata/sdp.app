import { getMembers } from "@/lib/db/members";
import { AdminDashboardClient } from "./AdminDashboardClient";

export default async function AdminDashboardPage() {
  const members = await getMembers();
  return <AdminDashboardClient members={members} />;
}
