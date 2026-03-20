"use client";

import { EnrollFlowShell } from "@/components/enrollment/EnrollFlowShell";

export default function AgentRegisterMemberPage() {
  return (
    <EnrollFlowShell
      backHref="/agent"
      backLabel="Back to agent portal"
      title="Register a member (Agent)"
      subtitle="Complete the full membership form on behalf of the member — same steps as public enrollment."
      portalContext="agent"
      progressTheme="primary"
    />
  );
}
