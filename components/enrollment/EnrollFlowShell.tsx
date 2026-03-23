"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { EnrollmentWizard } from "@/components/enrollment/EnrollmentWizard";
import { type EnrollmentFormData, formatEnrollmentNameWithTitleFromParts } from "@/lib/enrollment-schema";
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

export type EnrollPortalContext = "public" | "agent" | "cluster";
export type EnrollProgressTheme = "primary" | "accent";

function getStepFromState(state: unknown): number {
  const s = state as { step?: number } | null;
  if (s?.step != null && s.step >= 1 && s.step <= 5) return s.step;
  return 1;
}

export function EnrollFlowShell({
  backHref,
  backLabel,
  title,
  subtitle,
  portalContext = "public",
  progressTheme = "primary",
}: {
  backHref: string;
  backLabel: string;
  title: string;
  subtitle: string;
  portalContext?: EnrollPortalContext;
  progressTheme?: EnrollProgressTheme;
}) {
  const [step, setStepState] = useState(1);
  const [formData, setFormData] = useState<Partial<EnrollmentFormData>>({});
  const prevStepRef = useRef(step);

  const isPortal = portalContext === "agent" || portalContext === "cluster";
  const barComplete = progressTheme === "accent" ? "bg-sdp-accent" : "bg-sdp-primary";
  const barCurrentText = progressTheme === "accent" ? "text-sdp-accent" : "text-sdp-primary";

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

  const wizardPortal =
    portalContext === "public" ? undefined : portalContext;

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className={cn("mx-auto", step === 5 ? "max-w-[1100px]" : "max-w-xl")}>
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">{title}</h1>
          <p className="mt-1 text-sm text-neutral-600">{subtitle}</p>

          {isPortal && (
            <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-950">
              <strong>Same enrollment as the public form:</strong> identity, contact,
              geography, voter ID, photo, and consent all apply. Successful submissions
              are recorded as registered via the{" "}
              {portalContext === "agent" ? "agent" : "cluster"} portal and tied to your
              signed-in account.
            </div>
          )}

          <div
            className="mt-4"
            role="progressbar"
            aria-valuenow={step}
            aria-valuemin={1}
            aria-valuemax={5}
            aria-label="Enrollment progress"
          >
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
                        step >= s.id ? barComplete : "bg-neutral-200"
                      )}
                      aria-hidden
                    />
                    <span
                      className={cn(
                        "text-[10px] font-medium sm:text-xs",
                        isCurrent ? barCurrentText : "text-neutral-600"
                      )}
                    >
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

          {(formData.surname || formData.firstName || formData.state) && step < 5 && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-xs font-medium text-neutral-600">Summary so far</p>
              <p className="mt-1 text-sm font-medium text-neutral-900">
                {formatEnrollmentNameWithTitleFromParts({
                  title: formData.title,
                  surname: formData.surname ?? "",
                  firstName: formData.firstName ?? "",
                  otherNames: formData.otherNames,
                })}
                {formData.state && (
                  <span className="text-neutral-600">
                    {" "}
                    · {NIGERIA_STATES.find((st) => st.id === formData.state)?.name ?? formData.state}
                  </span>
                )}
                {formData.locationMembershipId && (
                  <span className="text-neutral-600"> · {formData.locationMembershipId}</span>
                )}
              </p>
              {!formData.locationMembershipId && (
                <p className="mt-1 text-xs text-neutral-500">
                  ID will be generated after you complete enrollment.
                </p>
              )}
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
          portalContext={wizardPortal}
          enrollmentSource={portalContext}
        />
      </div>
    </main>
  );
}
