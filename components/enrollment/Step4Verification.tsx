"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import {
  validateVoterId,
  formatVoterIdDisplay,
  normalizeVoterIdInput,
} from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PWD_CATEGORY_VALUES, type PwdCategory } from "@/lib/enrollment-schema";
import { Check, Camera, Upload, X, Loader2 } from "lucide-react";
import { submitEnrollment, type EnrollmentSource } from "@/app/actions/enrollment";
import { useLanguage } from "@/lib/i18n/context";
import { EnrollmentReviewDialog } from "@/components/enrollment/EnrollmentReviewDialog";

interface Step4VerificationProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
  enrollmentSource?: EnrollmentSource;
}

export function Step4Verification({
  form,
  onNext,
  onBack,
  formData,
  setFormData,
  enrollmentSource = "public",
}: Step4VerificationProps) {
  const { t } = useLanguage();
  const {
    formState: { errors },
    watch,
    setValue,
  } = form;
  const voterIdRaw = watch("voterRegistrationNumber") ?? "";
  const pwdIdentifies = watch("pwdIdentifies");
  const pwdCategory = watch("pwdCategory");
  const normalized = normalizeVoterIdInput(voterIdRaw);
  const isValidVoterId =
    (normalized.length === 19 || normalized.length === 20) && validateVoterId(normalized);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewMerged, setReviewMerged] = useState<EnrollmentFormData | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setShowCamera(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      setShowCamera(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not access camera";
      setCameraError(msg.includes("Permission") ? t.enrollment.step4.cameraPermissionDenied : t.enrollment.step4.cameraNotAvailable);
    }
  }, []);

  useEffect(() => {
    if (!showCamera || !streamRef.current) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }
    return () => {
      if (video && video.srcObject) {
        (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      }
    };
  }, [showCamera]);

  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream || video.readyState < 2) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return;

    const canvas = canvasRef.current || document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setValue("portraitDataUrl", dataUrl, { shouldValidate: true });
    stopCamera();
  }, [setValue, stopCamera]);

  const handleVoterIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = normalizeVoterIdInput(e.target.value);
    setValue("voterRegistrationNumber", raw, { shouldValidate: true });
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setValue("portraitDataUrl", reader.result as string);
    reader.readAsDataURL(file);
  };

  const portraitDataUrl = watch("portraitDataUrl");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const ok = await form.trigger();
    if (!ok) return;
    const values = form.getValues();
    const merged = { ...formData, ...values } as EnrollmentFormData;
    setFormData({ ...formData, ...values });
    setReviewMerged(merged);
    setReviewOpen(true);
  };

  const handleReviewOpenChange = (open: boolean) => {
    setReviewOpen(open);
    if (!open && !isSubmitting) {
      setSubmitError(null);
      setReviewMerged(null);
    }
  };

  const handleConfirmFromReview = async () => {
    if (!reviewMerged) return;
    setSubmitError(null);
    setIsSubmitting(true);
    const result = await submitEnrollment(reviewMerged, enrollmentSource);
    setIsSubmitting(false);
    if (result.ok) {
      if (result.member) {
        setFormData({
          ...reviewMerged,
          locationMembershipId: result.member.locationMembershipId,
          wardSerial: result.member.wardSerial,
          membershipId: result.member.membershipId,
        });
      } else {
        setFormData(reviewMerged);
      }
      setReviewOpen(false);
      setReviewMerged(null);
      onNext();
    } else {
      setSubmitError(result.error ?? t.enrollment.step4.registrationFailed);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="voterRegistrationNumber">{t.enrollment.step4.voterIdLabel}</Label>
        <p id="voter-hint-desc" className="text-xs text-neutral-500">
          {t.enrollment.step4.voterIdHint}
        </p>
        <div className="relative">
          <Input
            id="voterRegistrationNumber"
            value={formatVoterIdDisplay(voterIdRaw)}
            onChange={handleVoterIdChange}
            autoComplete="off"
            valid={errors.voterRegistrationNumber ? false : isValidVoterId ? true : undefined}
            placeholder={t.enrollment.step4.voterIdPlaceholder}
            className="pr-10 font-mono tracking-wider"
            maxLength={24}
            aria-invalid={!!errors.voterRegistrationNumber}
            aria-describedby="voter-hint-desc voter-hint voter-error"
          />
          {isValidVoterId && (
            <span
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sdp-accent"
              aria-hidden
            >
              <Check className="h-5 w-5" />
            </span>
          )}
        </div>
        <p id="voter-hint" className="text-xs text-neutral-500">
          {t.enrollment.step4.voterIdFormatHint}
        </p>
        {errors.voterRegistrationNumber && (
          <p id="voter-error" className="text-sm text-red-600" role="alert">
            {errors.voterRegistrationNumber.message}
          </p>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50/50 p-4">
        <div className="space-y-1">
          <Label className="text-neutral-900">{t.enrollment.step4.pwdQuestionLabel}</Label>
          <p className="text-xs text-neutral-500">{t.enrollment.step4.pwdQuestionHint}</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t.enrollment.step4.pwdQuestionLabel}>
          <Button
            type="button"
            variant={pwdIdentifies === true ? "default" : "outline"}
            className="min-h-[44px] min-w-[5rem]"
            onClick={() => {
              setValue("pwdIdentifies", true, { shouldValidate: true });
            }}
          >
            {t.enrollment.step4.pwdYes}
          </Button>
          <Button
            type="button"
            variant={pwdIdentifies === false ? "default" : "outline"}
            className="min-h-[44px] min-w-[5rem]"
            onClick={() => {
              setValue("pwdIdentifies", false, { shouldValidate: true });
              setValue("pwdCategory", undefined, { shouldValidate: true });
              setValue("pwdCategoryOther", "", { shouldValidate: true });
            }}
          >
            {t.enrollment.step4.pwdNo}
          </Button>
        </div>
        {errors.pwdIdentifies && (
          <p className="text-sm text-red-600" role="alert">
            {errors.pwdIdentifies.message}
          </p>
        )}

        {pwdIdentifies === true && (
          <div className="space-y-2 pt-1">
            <Label htmlFor="pwd-category">{t.enrollment.step4.pwdCategoryLabel}</Label>
            <Select
              value={pwdCategory ?? undefined}
              onValueChange={(v) => {
                setValue("pwdCategory", v as PwdCategory, { shouldValidate: true });
                if (v !== "other") {
                  setValue("pwdCategoryOther", "", { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="pwd-category" className="w-full" aria-invalid={!!errors.pwdCategory}>
                <SelectValue placeholder={t.enrollment.step4.pwdCategoryPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {PWD_CATEGORY_VALUES.map((v) => (
                  <SelectItem key={v} value={v}>
                    {(
                      {
                        wheelchair_mobility: t.enrollment.step4.pwdCategoryWheelchairMobility,
                        deaf_hard_of_hearing: t.enrollment.step4.pwdCategoryDeafHardOfHearing,
                        blind_visual: t.enrollment.step4.pwdCategoryBlindVisual,
                        intellectual_learning: t.enrollment.step4.pwdCategoryIntellectualLearning,
                        psychosocial_mental_health: t.enrollment.step4.pwdCategoryPsychosocialMentalHealth,
                        prefer_not_to_say: t.enrollment.step4.pwdCategoryPreferNotToSay,
                        other: t.enrollment.step4.pwdCategoryOther,
                      } satisfies Record<PwdCategory, string>
                    )[v]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.pwdCategory && (
              <p className="text-sm text-red-600" role="alert">
                {errors.pwdCategory.message}
              </p>
            )}

            {pwdCategory === "other" && (
              <div className="space-y-1">
                <Label htmlFor="pwd-category-other">{t.enrollment.step4.pwdCategoryOtherSpecifyLabel}</Label>
                <Input
                  id="pwd-category-other"
                  value={watch("pwdCategoryOther") ?? ""}
                  onChange={(e) =>
                    setValue("pwdCategoryOther", e.target.value, { shouldValidate: true })
                  }
                  placeholder={t.enrollment.step4.pwdCategoryOtherPlaceholder}
                  maxLength={200}
                  aria-invalid={!!errors.pwdCategoryOther}
                />
                {errors.pwdCategoryOther && (
                  <p className="text-sm text-red-600" role="alert">
                    {errors.pwdCategoryOther.message}
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label>{t.enrollment.step4.portraitLabel}</Label>

        {showCamera && (
          <div className="rounded-lg border border-neutral-200 bg-neutral-900 p-2">
            <div className="relative aspect-[4/3] max-h-[280px] overflow-hidden rounded-md bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: "scaleX(-1)" }}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="absolute right-2 top-2 h-8 w-8 rounded-full"
                onClick={stopCamera}
                aria-label="Close camera"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {cameraError && (
              <p className="mt-2 text-sm text-red-600" role="alert">{cameraError}</p>
            )}
            <div className="mt-2 flex gap-2">
              <Button
                type="button"
                className="min-h-[44px] flex-1"
                onClick={capturePhoto}
              >
                <Camera className="mr-2 h-4 w-4" />
                {t.enrollment.step4.capturePhoto}
              </Button>
              <Button type="button" variant="outline" className="min-h-[44px]" onClick={stopCamera}>
                {t.common.cancel}
              </Button>
            </div>
          </div>
        )}

        {!showCamera && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={uploadInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFile(e.target.files?.[0])}
                aria-label="Upload image from device"
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={startCamera}
              >
                <Camera className="h-4 w-4" />
                {t.enrollment.step4.useCamera}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="min-h-[44px] flex-1"
                onClick={() => uploadInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {t.enrollment.step4.uploadPhoto}
              </Button>
            </div>
            {portraitDataUrl && (
              <div className="mt-2 flex items-center gap-2">
                <img
                  src={portraitDataUrl}
                  alt="Portrait preview"
                  className="h-16 w-16 rounded-full object-cover ring-2 ring-sdp-primary"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValue("portraitDataUrl", "")}
                >
                  {t.enrollment.step4.removePhoto}
                </Button>
              </div>
            )}
            {!portraitDataUrl && errors.portraitDataUrl && (
              <p className="text-sm text-red-600" role="alert">
                {errors.portraitDataUrl.message}
              </p>
            )}
          </>
        )}

        <p id="portrait-desc" className="text-xs text-neutral-500">
          {t.enrollment.step4.portraitHint}
        </p>
      </div>

      <div className="space-y-2">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={watch("agreedToConstitution") === true}
            onChange={(e) => setValue("agreedToConstitution", e.target.checked, { shouldValidate: true })}
            className="mt-1 h-5 w-5 rounded border-neutral-300 text-sdp-primary focus:ring-sdp-primary"
            aria-describedby="consent-hint"
          />
          <span className="text-sm text-neutral-900">
            {t.enrollment.step4.agreedToConstitution}
          </span>
        </label>
        <p id="consent-hint" className="text-xs text-neutral-500 pl-8">
          {t.enrollment.step4.consentHint}
        </p>
        {errors.agreedToConstitution && (
          <p className="text-sm text-red-600 pl-8" role="alert">{errors.agreedToConstitution.message}</p>
        )}
      </div>

      {submitError && (
        <p className="text-sm text-red-600" role="alert">{submitError}</p>
      )}

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 min-h-[44px]" disabled={isSubmitting}>
          {t.enrollment.step4.back}
        </Button>
        <Button type="submit" className="flex-1 min-h-[44px]" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t.enrollment.step4.saving}
            </>
          ) : (
            t.enrollment.step4.completeRegistration
          )}
        </Button>
      </div>

      <canvas ref={canvasRef} className="hidden" aria-hidden />

      <EnrollmentReviewDialog
        open={reviewOpen}
        onOpenChange={handleReviewOpenChange}
        data={reviewMerged}
        onConfirmSubmit={handleConfirmFromReview}
        isSubmitting={isSubmitting}
        error={submitError}
      />
    </form>
  );
}
