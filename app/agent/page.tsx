"use client";

import { BulkPortalDashboard } from "@/components/portals/BulkPortalDashboard";

export default function AgentPortalPage() {
  return (
    <BulkPortalDashboard
      variant="agent"
      title="Agent portal"
      loginPath="/agent/login"
    />
  );
}
