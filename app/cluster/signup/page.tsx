import { PortalSignupPage } from "@/components/portals/PortalSignupPage";

export default function ClusterSignupPage() {
  return (
    <PortalSignupPage
      variant="cluster"
      title="Create cluster account"
      subtitle="Enter your invitation code from the national secretariat, then set your details and password."
      loginPath="/cluster/login"
      dashboardPath="/cluster"
    />
  );
}
