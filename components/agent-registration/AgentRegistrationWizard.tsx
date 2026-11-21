"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_AGENT_DRAFT,
  EMPTY_LOCATION,
  agentRegistrationSchema,
  zodFieldErrors,
  type AgentRegistrationDraft,
} from "@/lib/agent-registration-schema";
import { submitAgentRegistration } from "@/app/actions/agentRegistration";
import { verifyAgentRecruitmentCode } from "@/app/actions/agentRecruitment";
import { titleCaseStateName } from "@/lib/inec-states";
import { AgentStep1Assignment } from "./AgentStep1Assignment";
import { AgentStep2Personal } from "./AgentStep2Personal";
import { AgentReviewDialog } from "./AgentReviewDialog";

const FIELD_SCROLL_ORDER = [
  "recruitmentCode",
  "agentLevel",
  "assignment",
  "firstName",
  "surname",
  "gender",
  "phone",
  "photoDataUrl",
  "acknowledged",
] as const;

const FIELD_ELEMENT_IDS: Record<(typeof FIELD_SCROLL_ORDER)[number], string> = {
  recruitmentCode: "agent-recruitment-code",
  agentLevel: "agent-level-group",
  assignment: "agent-assignment-section",
  firstName: "agent-firstName",
  surname: "agent-surname",
  gender: "agent-gender",
  phone: "agent-phone",
  photoDataUrl: "agent-photo-upload",
  acknowledged: "agent-acknowledged",
};

function scrollToFirstError(errs: Record<string, string>) {
  for (const key of FIELD_SCROLL_ORDER) {
    if (!errs[key]) continue;
    const el = document.getElementById(FIELD_ELEMENT_IDS[key]);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      if (typeof (el as HTMLElement).focus === "function") {
        try {
          (el as HTMLElement).focus({ preventScroll: true });
        } catch {
          /* ignore */
        }
      }
      return;
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function AgentRegistrationWizard() {
  const [draft, setDraft] = useState<AgentRegistrationDraft>(EMPTY_AGENT_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);

  const update = (patch: Partial<AgentRegistrationDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const k of Object.keys(patch)) delete next[k];
      return next;
    });
  };

  const unlock = async () => {
    setIsUnlocking(true);
    setErrors((e) => {
      const next = { ...e };
      delete next.recruitmentCode;
      return next;
    });
    const result = await verifyAgentRecruitmentCode(draft.recruitmentCode).catch(() => ({
      ok: false as const,
      error: "Could not reach the server. Check your connection and try again.",
    }));
    setIsUnlocking(false);
    if (!result.ok) {
      setErrors((e) => ({ ...e, recruitmentCode: result.error }));
      update({
        codeUnlocked: false,
        unlockKind: "",
        unlockedAroLabel: "",
        lockedStateId: "",
        lockedStateName: "",
      });
      return;
    }
    if (result.kind === "state") {
      const stateName = titleCaseStateName(result.stateName);
      update({
        codeUnlocked: true,
        unlockKind: "state",
        unlockedAroLabel: result.label,
        lockedStateId: result.stateId,
        lockedStateName: stateName,
        recruitmentCode: draft.recruitmentCode.trim(),
        agentLevel: draft.agentLevel === "national" ? null : draft.agentLevel,
        assignment: {
          ...EMPTY_LOCATION,
          stateId: result.stateId,
          stateName,
        },
      });
      return;
    }
    update({
      codeUnlocked: true,
      unlockKind: "aro",
      unlockedAroLabel: result.label,
      lockedStateId: "",
      lockedStateName: "",
      recruitmentCode: draft.recruitmentCode.trim(),
    });
  };

  const handleReview = () => {
    if (!draft.codeUnlocked) {
      const next = { recruitmentCode: "Enter a valid recruitment code to continue." };
      setErrors(next);
      scrollToFirstError(next);
      return;
    }
    if (draft.lockedStateId && draft.agentLevel === "national") {
      const next = {
        agentLevel: "State recruitment codes cannot register a National Agent.",
      };
      setErrors(next);
      scrollToFirstError(next);
      return;
    }
    if (
      draft.lockedStateId &&
      draft.assignment.stateId &&
      draft.assignment.stateId !== draft.lockedStateId
    ) {
      const next = {
        assignment: `This code is locked to ${draft.lockedStateName}. Choose an assignment in that state.`,
      };
      setErrors(next);
      scrollToFirstError(next);
      return;
    }
    const result = agentRegistrationSchema.safeParse(draft);
    const next = result.success ? {} : zodFieldErrors(result.error);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      scrollToFirstError(next);
      return;
    }
    setSubmitError(null);
    setReviewOpen(true);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    const result = await submitAgentRegistration(draft).catch(() => ({
      ok: false as const,
      error: "Could not reach the server. Check your connection and try again.",
      fieldErrors: undefined,
    }));
    setIsSubmitting(false);
    if (result.ok) {
      const name = draft.firstName.trim();
      setReviewOpen(false);
      // Keep code unlocked so field officers can register the next person without re-entering it.
      setDraft({
        ...EMPTY_AGENT_DRAFT,
        recruitmentCode: draft.recruitmentCode,
        codeUnlocked: true,
        unlockKind: draft.unlockKind,
        unlockedAroLabel: draft.unlockedAroLabel,
        lockedStateId: draft.lockedStateId,
        lockedStateName: draft.lockedStateName,
        assignment: draft.lockedStateId
          ? {
              ...EMPTY_LOCATION,
              stateId: draft.lockedStateId,
              stateName: draft.lockedStateName,
            }
          : EMPTY_LOCATION,
      });
      setErrors({});
      setSubmitError(null);
      setSuccessName(name || "Applicant");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSubmitError(result.error);
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      setReviewOpen(false);
      if (result.fieldErrors.recruitmentCode) {
        update({
          codeUnlocked: false,
          unlockKind: "",
          unlockedAroLabel: "",
          lockedStateId: "",
          lockedStateName: "",
        });
      }
      scrollToFirstError(result.fieldErrors);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-xl">
          <h1 className="text-xl font-semibold text-neutral-900">Register as an agent</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Collect an access code from your state chair or any SDP Agent Recruitment Officer to apply.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-6 pb-24">
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
          <p>
            Please note that all agent registrations are subject to review and final approval by the
            Social Democratic Party.
          </p>
        </div>

        {successName ? (
          <div
            className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900"
            role="status"
          >
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
              <div className="flex-1">
                <p className="font-semibold">Registration submitted</p>
                <p className="mt-1 text-emerald-800">
                  Thank you, {successName}. The application has been received. Please note that all
                  agent registrations are subject to review and final approval by the Social
                  Democratic Party. Enter the next agent’s details below — your recruitment code
                  stays unlocked.
                </p>
              </div>
              <button
                type="button"
                className="text-xs font-medium text-emerald-800 underline"
                onClick={() => setSuccessName(null)}
              >
                Dismiss
              </button>
            </div>
          </div>
        ) : null}

        {Object.keys(errors).length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            Please fix the highlighted fields below.
          </div>
        ) : null}

        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Recruitment code</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Collect access code from your state chair or any SDP Agent Recruitment Officer
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-recruitment-code">Code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="agent-recruitment-code"
                  type="password"
                  inputMode="text"
                  autoComplete="new-password"
                  autoCorrect="off"
                  spellCheck={false}
                  value={draft.recruitmentCode}
                  onChange={(e) =>
                    update({
                      recruitmentCode: e.target.value,
                      codeUnlocked: false,
                      unlockKind: "",
                      unlockedAroLabel: "",
                      lockedStateId: "",
                      lockedStateName: "",
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void unlock();
                    }
                  }}
                  className="min-h-[44px] pl-10 font-mono tracking-wide"
                  valid={errors.recruitmentCode ? false : undefined}
                  disabled={isUnlocking || draft.codeUnlocked}
                  aria-label="Access code (hidden while typing)"
                />
              </div>
              <Button
                type="button"
                className="min-h-[44px] bg-sdp-primary text-white hover:bg-sdp-primary/90"
                onClick={unlock}
                disabled={isUnlocking || !draft.recruitmentCode.trim()}
              >
                {isUnlocking ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isUnlocking ? "Checking…" : draft.codeUnlocked ? "Verified" : "Unlock form"}
              </Button>
            </div>
            {errors.recruitmentCode ? (
              <p className="text-sm text-red-600" role="alert">
                {errors.recruitmentCode}
              </p>
            ) : null}
            {draft.codeUnlocked ? (
              <p className="text-sm text-emerald-700">
                Code accepted — {draft.unlockedAroLabel}
                {draft.lockedStateId
                  ? `. Assignments are locked to ${draft.lockedStateName}.`
                  : "."}{" "}
                Complete the form below.
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 shadow-sm"
          role="note"
        >
          <p>
            Please note agent registration is <strong className="font-bold">free</strong>. Please
            disregard or report anyone requesting for a fee. For enquiries or more information,
            contact:
          </p>
          <ul className="mt-3 space-y-2">
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <a
                href="tel:+2347043979165"
                className="font-semibold text-amber-950 underline-offset-2 hover:underline"
              >
                +234 704 397 9165
              </a>
              <span className="text-amber-900">Front Desk</span>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <a
                href="tel:+2348066524457"
                className="font-semibold text-amber-950 underline-offset-2 hover:underline"
              >
                +234 806 652 4457
              </a>
              <span className="text-amber-900">Organisation</span>
            </li>
            <li className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
              <a
                href="tel:+2348033022578"
                className="font-semibold text-amber-950 underline-offset-2 hover:underline"
              >
                +234 803 302 2578
              </a>
              <span className="text-amber-900">Administration</span>
            </li>
          </ul>
        </div>

        {draft.codeUnlocked ? (
          <>
            <AgentStep1Assignment draft={draft} update={update} errors={errors} />
            <AgentStep2Personal draft={draft} update={update} errors={errors} />

            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
              <p>
                Please note that all agent registrations are subject to review and final approval by
                the Social Democratic Party.
              </p>
            </div>

            <Button type="button" className="min-h-[48px] w-full" onClick={handleReview} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Please wait…
                </>
              ) : (
                "Review & submit"
              )}
            </Button>
          </>
        ) : null}
      </div>

      <AgentReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        draft={draft}
        onConfirm={handleSubmit}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </main>
  );
}
