"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { EnrollmentWizard } from "@/components/enrollment/EnrollmentWizard";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";

const STEPS = [
  { id: 1, label: "Identity" },
  { id: 2, label: "Contact & Age" },
  { id: 3, label: "Geography" },
  { id: 4, label: "Verification" },
  { id: 5, label: "Preview" },
];

function getStepFromState(state: unknown): number {
  const s = state as { step?: number } | null;
  if (s?.step != null && s.step >= 1 && s.step <= 5) return s.step;
  return 1;
}

export default function EnrollNewPage() {
  // Always start with step 1 so server and client render the same (avoids hydration mismatch).
  const [step, setStepState] = useState(1);
  const [formData, setFormData] = useState<Partial<EnrollmentFormData>>({});
  const prevStepRef = useRef(step);

  // After hydration, sync step from history once so back/forward and deep links work.
  useEffect(() => {
    const path = window.location.pathname;
    const fromHistory = getStepFromState(window.history.state);
    if (fromHistory !== 1) setStepState(fromHistory);
    window.history.replaceState({ step: fromHistory }, "", path);
    prevStepRef.current = fromHistory;
  }, []);

  useEffect(() => {
    if (prevStepRef.current === step) return;
    const path = window.location.pathname;
    if (step > prevStepRef.current) {
      window.history.pushState({ step }, "", path);
    } else {
      window.history.replaceState({ step }, "", path);
    }
    prevStepRef.current = step;
  }, [step]);

  useEffect(() => {
    const onPopState = (e: PopStateEvent) => {
      const next = getStepFromState(e.state);
      setStepState(next);
      prevStepRef.current = next;
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const setStep = (n: number) => setStepState(Math.max(1, Math.min(5, n)));

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className={cn("mx-auto", step === 5 ? "max-w-[1100px]" : "max-w-xl")}>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to homepage
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">
            SDP Member Enrollment
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            Join the Social Democratic Party
          </p>
          <div className="mt-4" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={5} aria-label="Enrollment progress">
            <div className="flex gap-2">
              {STEPS.map((s) => {
                const isComplete = step > s.id;
                const isCurrent = step === s.id;
                const isClickable = isComplete;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => isClickable && setStep(s.id)}
                    disabled={!isClickable}
                    className={cn(
                      "flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-2 transition-colors min-h-[52px] justify-center",
                      isClickable && "cursor-pointer hover:bg-neutral-100",
                      !isClickable && "cursor-default"
                    )}
                    aria-current={isCurrent ? "step" : undefined}
                    aria-label={`Step ${s.id}: ${s.label}${isComplete ? ", completed" : ""}${isCurrent ? ", current" : ""}`}
                  >
                    <span
                      className={cn(
                        "h-2 w-full rounded-full transition-colors",
                        step >= s.id ? "bg-sdp-primary" : "bg-neutral-200"
                      )}
                      aria-hidden
                    />
                    <span className={cn(
                      "text-[10px] font-medium sm:text-xs",
                      isCurrent ? "text-sdp-primary" : "text-neutral-600"
                    )}>
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs font-medium text-neutral-600">
              Step {step} of 5: {STEPS[step - 1]?.label}
            </p>
          </div>

          {/* Live summary — updates as user progresses */}
          {(formData.surname || formData.firstName || formData.state) && step < 5 && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-medium text-neutral-600">Your summary so far</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {[formData.title, formData.surname, formData.firstName, formData.otherNames].filter(Boolean).join(" ")}
                {formData.state && (
                  <span className="text-neutral-600">
                    {" "}· {NIGERIA_STATES.find((s) => s.id === formData.state)?.name ?? formData.state}
                  </span>
                )}
                {formData.voterRegistrationNumber && formData.surname && (
                  <span className="text-neutral-600">
                    {" "}· {getMembershipIdFromData({ surname: formData.surname, voterRegistrationNumber: formData.voterRegistrationNumber })}
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className={cn("mx-auto px-4 py-6 pb-24", step === 5 ? "max-w-[1100px]" : "max-w-xl")}>
        <EnrollmentWizard
          step={step}
          setStep={setStep}
          formData={formData}
          setFormData={setFormData}
        />
      </div>
    </main>
  );
}
