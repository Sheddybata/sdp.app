import type { Metadata } from "next";
import { AgentRegistrationWizard } from "@/components/agent-registration/AgentRegistrationWizard";

const title = "Register as an SDP Agent";
const description =
  "Apply to serve as an SDP election agent. Enter your recruitment code to begin registration.";

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/agent/apply",
    siteName: "Social Democratic Party",
    type: "website",
    images: [
      {
        url: "/og-agent.jpg",
        width: 1200,
        height: 630,
        alt: "SDP Agent registration",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-agent.jpg"],
  },
};

export default function AgentApplyPage() {
  return <AgentRegistrationWizard />;
}
