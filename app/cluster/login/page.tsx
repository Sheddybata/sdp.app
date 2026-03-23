import type { Metadata } from "next";
import { PortalLoginPage } from "@/components/portals/PortalLoginPage";

export const metadata: Metadata = {
  title: "Group registration — Sign in",
};

export default function ClusterLoginPage() {
  return (
    <PortalLoginPage
      variant="cluster"
      title="Group registration"
      subtitle="Sign in to upload CSV or Excel lists for your group."
      dashboardPath="/cluster"
      signupPath="/cluster/signup"
    />
  );
}
