import { getMembers } from "@/lib/db/members";
import { AdminMembersClient } from "./AdminMembersClient";

export default async function AdminMembersPage() {
  const members = await getMembers();
  return <AdminMembersClient initialMembers={members} />;
}
