"use client";

import { EnrollFlowShell } from "@/components/enrollment/EnrollFlowShell";

export default function EnrollNewPage() {
  return (
    <EnrollFlowShell
      backHref="/"
      backLabel="Back to homepage"
      title="SDP Member Enrollment"
      subtitle="Join the Social Democratic Party"
      portalContext="public"
      progressTheme="primary"
    />
  );
}
