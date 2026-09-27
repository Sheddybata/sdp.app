"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  EMPTY_AGENT_DRAFT,
  agentStep1Schema,
  agentStep2Schema,
  agentStep3Schema,
  zodFieldErrors,
  type AgentRegistrationDraft,
} from "@/lib/agent-registration-schema";
import { submitAgentRegistration } from "@/app/actions/agentRegistration";
import { AgentStep1Assignment } from "./AgentStep1Assignment";
import { AgentStep2Personal } from "./AgentStep2Personal";
import { AgentStep3Documents } from "./AgentStep3Documents";
import { AgentReviewDialog } from "./AgentReviewDialog";

const STEPS = [
  { id: 1, label: "Assignment" },
  { id: 2, label: "Personal details" },
  { id: 3, label: "Documents" },
] as const;

const STEP_SCHEMAS = [agentStep1Schema, agentStep2Schema, agentStep3Schema] as const;

/** Which step owns each field, so server-side errors send the user back to the right screen. */
const FIELD_STEP: Record<string, number> = {
  agentLevel: 1,
  assignment: 1,
  ...Object.fromEntries(Object.keys(agentStep2Schema.shape).map((k) => [k, 2])),
};

export function AgentRegistrationWizard() {
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<AgentRegistrationDraft>(EMPTY_AGENT_DRAFT);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [reviewOpen, setReviewOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const goTo = (n: number) => {
    setStep(n);
    window.scrollTo(0, 0);
  };

  const validateStep = (n: number): boolean => {
    const result = STEP_SCHEMAS[n - 1].safeParse(draft);
    if (result.success) {
      setErrors({});
      return true;
    }
    setErrors(zodFieldErrors(result.error));
    window.scrollTo(0, 0);
    return false;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    if (step < 3) goTo(step + 1);
    else {
      setSubmitError(null);
      setReviewOpen(true);
    }
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
      const firstKey = Object.keys(result.fieldErrors)[0];
      const target = FIELD_STEP[firstKey] ?? 3;
      setErrors(result.fieldErrors);
      if (target !== 3) {
        setReviewOpen(false);
        goTo(target);
      }
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-neutral-50 px-4 py-10">
        <div className="mx-auto max-w-md rounded-xl border border-neutral-200 bg-white p-6 text-center shadow-sm ring-2 ring-sdp-primary/20 sm:p-8">
          <CheckCircle2 className="mx-auto h-12 w-12 text-sdp-accent" aria-hidden />
          <h1 className="mt-4 text-2xl font-semibold text-neutral-900">Registration submitted</h1>
          <p className="mt-2 text-sm text-neutral-600">
            Thank you, {draft.firstName}. The national secretariat will review your details. Once
            approved, sign in to the agent portal with <strong>{draft.email}</strong> and the password
            you created.
          </p>
          <Button asChild className="mt-6 min-h-[44px] w-full bg-sdp-primary text-white hover:bg-sdp-primary/90">
            <Link href="/agent/login">Go to agent sign-in</Link>
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
            href="/agent/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to agent sign-in
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">Register as an agent</h1>
          <p className="mt-1 text-sm text-neutral-600">
            Complete all three steps. Your account will be activated after the national secretariat
            approves it.
          </p>

          <div
            className="mt-4"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={STEPS.length}
            aria-label="Registration progress"
          >
            <div className="flex gap-2">
              {STEPS.map((s) => {
                const isComplete = step > s.id;
                const isCurrent = step === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => isComplete && goTo(s.id)}
                    disabled={!isComplete}
                    className={cn(
                      "flex min-h-[52px] flex-1 flex-col items-center justify-center gap-1 rounded-lg px-2 py-2 transition-colors",
                      isComplete ? "cursor-pointer hover:bg-neutral-100" : "cursor-default"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                  >
                    <span
                      className={cn(
                        "h-2 w-full rounded-full transition-colors",
                        step >= s.id ? "bg-sdp-primary" : "bg-neutral-200"
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium sm:text-xs",
                        isCurrent ? "text-sdp-primary" : "text-neutral-600"
                      )}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-600">
              Step {step} of {STEPS.length}: {STEPS[step - 1].label}
            </p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 pb-24">
        {Object.keys(errors).length > 0 ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
            Please fix the highlighted fields below.
          </div>
        ) : null}

        {step === 1 && <AgentStep1Assignment draft={draft} update={update} errors={errors} />}
        {step === 2 && <AgentStep2Personal draft={draft} update={update} errors={errors} />}
        {step === 3 && <AgentStep3Documents draft={draft} update={update} errors={errors} />}

        <div className="flex gap-3 pt-6">
          {step > 1 ? (
            <Button
              type="button"
              variant="outline"
              className="min-h-[44px] flex-1"
              onClick={() => goTo(step - 1)}
            >
              Back
            </Button>
          ) : null}
          <Button type="button" className="min-h-[44px] flex-1" onClick={handleNext}>
            {step < 3 ? "Continue" : "Review & submit"}
          </Button>
        </div>
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
