"use client";

import { EnrollFlowShell } from "@/components/enrollment/EnrollFlowShell";

export default function ClusterRegisterMemberPage() {
  return (
    <EnrollFlowShell
      backHref="/cluster"
      backLabel="Back to cluster portal"
      title="Register a member (Cluster)"
      subtitle="Complete the full membership form on behalf of the member — same steps as public enrollment."
      portalContext="cluster"
      progressTheme="accent"
    />
  );
}
