import { PortalSignupPage } from "@/components/portals/PortalSignupPage";

export default function AgentSignupPage() {
  return (
    <PortalSignupPage
      variant="agent"
      title="Create agent account"
      subtitle="Enter your invitation code from the national secretariat, then set your details and password."
      loginPath="/agent/login"
      dashboardPath="/agent"
    />
  );
}
