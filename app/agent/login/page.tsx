import { PortalLoginPage } from "@/components/portals/PortalLoginPage";

export default function AgentLoginPage() {
  return (
    <PortalLoginPage
      variant="agent"
      title="Agent portal"
      subtitle="Field officers with an invitation code can sign in here. Most agents only need to register — no login required."
      dashboardPath="/agent"
      signupPath="/agent/signup"
      registerPath="/agent/apply"
    />
  );
}
