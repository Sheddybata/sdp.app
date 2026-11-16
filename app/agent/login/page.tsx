import { PortalLoginPage } from "@/components/portals/PortalLoginPage";

export default function AgentLoginPage() {
  return (
    <PortalLoginPage
      variant="agent"
      title="Agent portal"
      subtitle="Sign in with your phone number and password to access the agent portal."
      dashboardPath="/agent"
      signupPath="/agent/signup"
      registerPath="/agent/apply"
    />
  );
}
