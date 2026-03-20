import { PortalLoginPage } from "@/components/portals/PortalLoginPage";

export default function AgentLoginPage() {
  return (
    <PortalLoginPage
      variant="agent"
      title="Agent portal"
      subtitle="Sign in to upload CSV or Excel lists for bulk member registration."
      dashboardPath="/agent"
      signupPath="/agent/signup"
    />
  );
}
