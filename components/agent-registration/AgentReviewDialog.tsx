"use client";

import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatVoterIdDisplay } from "@/lib/enrollment-schema";
import {
  AGENT_LEVEL_LABELS,
  formatLocationPick,
  type AgentRegistrationDraft,
} from "@/lib/agent-registration-schema";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="grid gap-0.5 border-b border-neutral-100 py-2.5 last:border-0 sm:grid-cols-[minmax(8rem,38%)_1fr]">
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="break-words text-sm text-neutral-900">{value || "—"}</dd>
    </div>
  );
}

function Section({ title }: { title: string }) {
  return (
    <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-sdp-primary first:mt-0">
      {title}
    </p>
  );
}

export function AgentReviewDialog({
  open,
  onOpenChange,
  draft,
  onConfirm,
  isSubmitting,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  draft: AgentRegistrationDraft;
  onConfirm: () => void;
  isSubmitting: boolean;
  error: string | null;
}) {
  const level = draft.agentLevel;
  const docs: [string, string][] = [
    ["Photo", draft.photoDataUrl],
    ["Membership ID", draft.membershipIdCardDataUrl],
    ["PVC", draft.pvcDataUrl],
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="flex max-h-[min(90vh,760px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="shrink-0 space-y-1 border-b border-neutral-200 px-4 py-4 text-left sm:px-6">
          <DialogTitle className="text-lg">Check your details</DialogTitle>
          <DialogDescription>
            Close this window to go back and edit. When everything is correct, tap Submit registration.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6">
          <dl>
            <Section title="Assignment" />
            <Row label="Agent type" value={level ? AGENT_LEVEL_LABELS[level] : "—"} />
            <Row label="Location and code" value={level ? formatLocationPick(draft.assignment, level) : "—"} />

            <Section title="Personal details" />
            <Row
              label="Name"
              value={[draft.firstName, draft.middleName, draft.surname].filter(Boolean).join(" ")}
            />
            <Row label="Phone" value={draft.phone} />
            <Row label="Email" value={draft.email} />
            <Row label="NIN" value={draft.nin} />
            <Row label="Voter registration number" value={formatVoterIdDisplay(draft.voterIdentificationNumber)} />
            <Row label="SDP membership ID" value={draft.sdpMembershipId} />
            <Row label="Agent's polling unit" value={formatLocationPick(draft.agentPollingUnit)} />
            <Row label="Agent voting unit" value={formatLocationPick(draft.agentVotingUnit)} />
            <Row label="Polling unit (name/code)" value={formatLocationPick(draft.pollingUnit)} />

            <Section title="Documents" />
            <div className="grid grid-cols-2 gap-3 py-2 sm:grid-cols-4">
              {docs.map(([label, src]) => (
                <figure key={label} className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={label}
                    className="h-20 w-full rounded-md border border-neutral-200 bg-white object-contain"
                  />
                  <figcaption className="text-center text-xs text-neutral-600">{label}</figcaption>
                </figure>
              ))}
            </div>
            <Row label="Declaration" value={draft.acknowledged ? "Accepted" : "Not accepted"} />
          </dl>
        </div>

        <DialogFooter className="shrink-0 flex-col gap-3 border-t border-neutral-200 bg-neutral-50/80 px-4 py-4 sm:flex-row sm:px-6">
          {error ? (
            <p className="w-full text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="button"
            className="min-h-[48px] w-full sm:w-auto sm:min-w-[200px]"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Submitting…
              </>
            ) : (
              "Submit registration"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
