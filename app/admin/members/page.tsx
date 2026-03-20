import { getMembers } from "@/lib/db/members";
import { getDiasporaSupporters } from "@/lib/db/diaspora-supporters";
import { AdminMembersClient } from "./AdminMembersClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminMembersPage() {
  const [members, diaspora] = await Promise.all([getMembers(), getDiasporaSupporters()]);
  return <AdminMembersClient initialMembers={members} initialDiaspora={diaspora} />;
}
