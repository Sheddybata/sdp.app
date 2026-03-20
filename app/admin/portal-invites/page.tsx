import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { listPortalInvites } from "@/lib/db/portal-users";
import { AdminPortalInvitesClient } from "./AdminPortalInvitesClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPortalInvitesPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const invites = await listPortalInvites();
  return <AdminPortalInvitesClient initialInvites={invites} />;
}
