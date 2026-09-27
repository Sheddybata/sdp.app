import type { AgentRegistrationDraft } from "@/lib/agent-registration-schema";

export type AgentStepProps = {
  draft: AgentRegistrationDraft;
  update: (patch: Partial<AgentRegistrationDraft>) => void;
  errors: Record<string, string>;
};
