"use client";

import { BulkPortalDashboard } from "@/components/portals/BulkPortalDashboard";

export default function ClusterPortalPage() {
  return (
    <BulkPortalDashboard
      variant="cluster"
      title="Cluster portal"
      loginPath="/cluster/login"
    />
  );
}
