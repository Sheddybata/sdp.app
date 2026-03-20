import { redirect } from "next/navigation";
import { isAuthenticated } from "@/app/actions/auth";
import { listPortalBulkUploads } from "@/lib/db/portal-bulk-uploads";
import { AdminPortalBulkUploadsClient } from "./AdminPortalBulkUploadsClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminPortalUploadsPage() {
  if (!(await isAuthenticated())) {
    redirect("/admin/login");
  }

  const uploads = await listPortalBulkUploads(200);
  return <AdminPortalBulkUploadsClient initialUploads={uploads} />;
}
