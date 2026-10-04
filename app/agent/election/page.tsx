import type { Metadata } from "next";
import { AgentElectionClient } from "@/components/election/AgentElectionClient";

export const metadata: Metadata = { title: "Election day | SDP agent portal" };

export default function AgentElectionPage() {
  return <AgentElectionClient />;
}
