import type { Metadata } from "next";
import { PortalSignupPage } from "@/components/portals/PortalSignupPage";

export const metadata: Metadata = {
  title: "Group registration — Sign up",
};

export default function ClusterSignupPage() {
  return (
    <PortalSignupPage
      variant="cluster"
      title="Group registration"
      subtitle="Enter your invitation code from the national secretariat, then set your details and password."
      loginPath="/cluster/login"
      dashboardPath="/cluster"
    />
  );
}
