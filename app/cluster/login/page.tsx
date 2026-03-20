import { PortalLoginPage } from "@/components/portals/PortalLoginPage";

export default function ClusterLoginPage() {
  return (
    <PortalLoginPage
      variant="cluster"
      title="Cluster portal"
      subtitle="Sign in to upload CSV or Excel lists for your cluster."
      dashboardPath="/cluster"
      signupPath="/cluster/signup"
    />
  );
}
