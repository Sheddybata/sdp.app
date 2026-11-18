"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  EMPTY_AGENT_DRAFT,
  agentRegistrationSchema,
  zodFieldErrors,
  type AgentRegistrationDraft,
} from "@/lib/agent-registration-schema";
import { submitAgentRegistration } from "@/app/actions/agentRegistration";
import { verifyAgentRecruitmentCode } from "@/app/actions/agentRecruitment";
import { AgentStep1Assignment } from "./AgentStep1Assignment";
import { AgentStep2Personal } from "./AgentStep2Personal";
import { AgentReviewDialog } from "./AgentReviewDialog";

export function AgentRegistrationWizard() {
  const [draft, setDraft] = useState<AgentRegistrationDraft>(EMPTY_AGENT_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

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
      update({ codeUnlocked: false, unlockedAroLabel: "" });
      return;
    }
    update({
      codeUnlocked: true,
      unlockedAroLabel: result.label,
      recruitmentCode: draft.recruitmentCode.trim(),
    });
  };

  const handleReview = () => {
    if (!draft.codeUnlocked) {
      setErrors({ recruitmentCode: "Enter a valid recruitment code to continue." });
      window.scrollTo(0, 0);
      return;
    }
    const result = agentRegistrationSchema.safeParse(draft);
    const next = result.success ? {} : zodFieldErrors(result.error);
    setErrors(next);
    if (Object.keys(next).length > 0) {
      window.scrollTo(0, 0);
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
      setReviewOpen(false);
      setSubmitted(true);
      window.scrollTo(0, 0);
      return;
    }
    setSubmitError(result.error);
    if (result.fieldErrors) {
      setErrors(result.fieldErrors);
      setReviewOpen(false);
      if (result.fieldErrors.recruitmentCode) {
        update({ codeUnlocked: false, unlockedAroLabel: "" });
      }
      window.scrollTo(0, 0);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm ring-2 ring-sdp-primary/20 sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-sdp-accent" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Registration submitted</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Thank you, {draft.firstName}. Your application has been received and is{" "}
            <strong>subject to party endorsement</strong>. The national secretariat will review your
            details. You do not need to sign in.
          </p>
          <Button asChild className="mt-6 min-h-[44px] w-full bg-sdp-primary text-white hover:bg-sdp-primary/90">
            <Link href="/">Back to homepage</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">Register as an agent</h1>
          <p className="mt-1 text-sm text-neutral-600">
            You need a recruitment code from an Agent Registration Officer before you can apply.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl space-y-6 px-4 py-6 pb-24">
        {Object.keys(errors).length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            Please fix the highlighted fields below.
          </div>
        ) : null}

        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Recruitment code</h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              Get this code from your Agent Registration Officer (ARO 1–5).
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-recruitment-code">Code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <div className="relative flex-1">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="agent-recruitment-code"
                  value={draft.recruitmentCode}
                  onChange={(e) =>
                    update({
                      recruitmentCode: e.target.value,
                      codeUnlocked: false,
                      unlockedAroLabel: "",
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void unlock();
                    }
                  }}
                  placeholder="e.g. A3-7K2M"
                  autoCapitalize="characters"
                  className="min-h-[44px] pl-10 font-mono uppercase tracking-wide"
                  aria-invalid={!!errors.recruitmentCode}
                  disabled={isUnlocking}
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
                Code accepted — {draft.unlockedAroLabel}. Complete the form below.
              </p>
            ) : null}
          </div>
        </div>

        {draft.codeUnlocked ? (
          <>
            <AgentStep1Assignment draft={draft} update={update} errors={errors} />
            <AgentStep2Personal draft={draft} update={update} errors={errors} />

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
