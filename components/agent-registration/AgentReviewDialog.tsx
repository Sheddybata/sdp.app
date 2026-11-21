"use client";

import type { ReactNode } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
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
            <Row label="Recruitment" value={draft.unlockedAroLabel || "—"} />
            <Row label="Agent type" value={level ? AGENT_LEVEL_LABELS[level] : "—"} />
            <Row label="Location and code" value={level ? formatLocationPick(draft.assignment, level) : "—"} />

            <Section title="Personal details" />
            <Row label="Name" value={[draft.firstName, draft.surname].filter(Boolean).join(" ")} />
            <Row label="Gender" value={draft.gender || "—"} />
            <Row label="Phone" value={draft.phone} />

            <Section title="Photo" />
            {draft.photoDataUrl ? (
              <figure className="space-y-1 py-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={draft.photoDataUrl}
                  alt="Passport photo"
                  className="h-28 w-28 rounded-md border border-neutral-200 bg-white object-cover"
                />
              </figure>
            ) : (
              <Row label="Photo" value="—" />
            )}
            <Row label="Declaration" value={draft.acknowledged ? "Accepted" : "Not accepted"} />
          </dl>
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <p>
              Please note that all agent registrations are subject to review and final approval by
              the Social Democratic Party.
            </p>
          </div>
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
