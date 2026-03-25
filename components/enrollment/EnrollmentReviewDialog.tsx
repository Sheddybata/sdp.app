"use client";

import type { ReactNode } from "react";
import { format, parseISO, isValid } from "date-fns";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { formatVoterIdDisplay } from "@/lib/enrollment-schema";
import { getPwdCategoryLabel } from "@/lib/pwd-enrollment";
import { useLanguage } from "@/lib/i18n/context";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function formatDob(iso: string): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "d MMM yyyy") : iso;
}

function formatJoinMonthYear(iso: string): string {
  if (!iso) return "—";
  const d = parseISO(iso);
  return isValid(d) ? format(d, "MMMM yyyy") : iso;
}

function ReviewRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("grid gap-0.5 border-b border-neutral-100 py-2.5 last:border-0 sm:grid-cols-[minmax(8rem,34%)_1fr]", className)}>
      <dt className="text-xs font-medium text-neutral-500">{label}</dt>
      <dd className="text-sm text-neutral-900 break-words">{value || "—"}</dd>
    </div>
  );
}

interface EnrollmentReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: EnrollmentFormData | null;
  onConfirmSubmit: () => Promise<void>;
  isSubmitting: boolean;
  error: string | null;
}

export function EnrollmentReviewDialog({
  open,
  onOpenChange,
  data,
  onConfirmSubmit,
  isSubmitting,
  error,
}: EnrollmentReviewDialogProps) {
  const { t } = useLanguage();

  if (!data) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[min(90vh,720px)] w-[calc(100%-1.5rem)] max-w-xl flex-col gap-0 overflow-hidden p-0 sm:w-full"
        )}
        onPointerDownOutside={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <DialogHeader className="relative shrink-0 space-y-1 border-b border-neutral-200 px-4 py-4 pr-12 text-left sm:px-6">
          <DialogTitle className="text-lg leading-snug pr-2">{t.enrollment.step4.reviewDialogTitle}</DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            {t.enrollment.step4.reviewDialogDescription}
          </DialogDescription>
          <DialogClose
            type="button"
            className="absolute right-4 top-4 rounded-md p-2 text-neutral-500 opacity-90 ring-offset-white transition hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus:ring-2 focus:ring-sdp-primary focus:ring-offset-2 disabled:pointer-events-none"
            aria-label={t.common.close}
            disabled={isSubmitting}
          >
            <X className="h-5 w-5" />
          </DialogClose>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 sm:px-6">
          <dl>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sdp-primary">
              {t.enrollment.step1.title}
            </p>
            <ReviewRow label={t.enrollment.step1.titleLabel} value={data.title} />
            <ReviewRow label={t.enrollment.step1.surnameLabel} value={data.surname} />
            <ReviewRow label={t.enrollment.step1.firstNameLabel} value={data.firstName} />
            <ReviewRow label={t.enrollment.step1.otherNamesLabel} value={data.otherNames || "—"} />
            <ReviewRow label={t.enrollment.step1.ninLabel} value={data.nin} />

            <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-sdp-primary">
              {t.enrollment.step2.title}
            </p>
            <ReviewRow label={t.enrollment.step2.phoneLabel} value={data.phone} />
            <ReviewRow
              label={t.enrollment.step4.reviewPhoneVerificationLabel}
              value={
                data.phoneVerified ? (
                  <span className="text-emerald-700">{t.enrollment.step4.reviewPhoneVerified}</span>
                ) : (
                  <span className="text-amber-700">{t.enrollment.step4.reviewPhoneNotVerified}</span>
                )
              }
            />
            <ReviewRow label={t.enrollment.step2.emailLabel} value={data.email?.trim() || "—"} />
            <ReviewRow label={t.enrollment.step2.dobLabel} value={formatDob(data.dateOfBirth)} />
            <ReviewRow label={t.enrollment.step2.addressLabel} value={data.address} />

            <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-sdp-primary">
              {t.enrollment.step3.title}
            </p>
            <ReviewRow label={t.enrollment.step3.joinDateLabel} value={formatJoinMonthYear(data.joinDate)} />
            <ReviewRow label={t.enrollment.step3.stateLabel} value={data.state} />
            <ReviewRow label={t.enrollment.step3.lgaLabel} value={data.lga} />
            <ReviewRow label={t.enrollment.step3.wardLabel} value={data.ward} />
            <ReviewRow label={t.enrollment.step3.pollingUnitLabel} value={data.pollingUnit} />

            <p className="mb-1 mt-4 text-xs font-semibold uppercase tracking-wide text-sdp-primary">
              {t.enrollment.step4.title}
            </p>
            <ReviewRow
              label={t.enrollment.step4.voterIdLabel}
              value={formatVoterIdDisplay(data.voterRegistrationNumber)}
            />
            <ReviewRow
              label={t.enrollment.step4.reviewPwdIdentifiesLabel}
              value={
                data.pwdIdentifies
                  ? t.enrollment.step4.reviewPwdYes
                  : t.enrollment.step4.reviewPwdNo
              }
            />
            <ReviewRow
              label={t.enrollment.step4.reviewPwdCategoryLabel}
              value={
                data.pwdIdentifies
                  ? getPwdCategoryLabel(data.pwdCategory, t.enrollment.step4)
                  : "—"
              }
            />
            {data.pwdIdentifies && data.pwdCategory === "other" && (
              <ReviewRow
                label={t.enrollment.step4.reviewPwdOtherDetailLabel}
                value={data.pwdCategoryOther?.trim() || "—"}
              />
            )}
            <ReviewRow
              label={t.enrollment.step4.portraitLabel}
              value={
                data.portraitDataUrl ? (
                  <img
                    src={data.portraitDataUrl}
                    alt=""
                    className="h-20 w-20 rounded-full object-cover ring-2 ring-sdp-primary/30"
                  />
                ) : (
                  "—"
                )
              }
            />
            <ReviewRow
              label={t.enrollment.step4.agreedToConstitution}
              value={
                data.agreedToConstitution
                  ? t.enrollment.step4.reviewConstitutionYes
                  : t.enrollment.step4.reviewConstitutionNotAgreed
              }
            />
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
            onClick={() => void onConfirmSubmit()}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t.enrollment.step4.saving}
              </>
            ) : (
              t.enrollment.step4.confirmSubmitRegistration
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
