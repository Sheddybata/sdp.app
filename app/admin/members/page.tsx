import { getMembers } from "@/lib/db/members";
import { AdminMembersClient } from "./AdminMembersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMembersPage() {
  const members = await getMembers();
  return <AdminMembersClient initialMembers={members} />;
}
