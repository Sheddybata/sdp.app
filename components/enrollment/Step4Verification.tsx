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
import { Check, Camera, Upload, X, Loader2 } from "lucide-react";
import { submitEnrollment } from "@/app/actions/enrollment";
import { useLanguage } from "@/lib/i18n/context";

interface Step4VerificationProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

const STEP4_FIELDS = ["voterRegistrationNumber", "portraitDataUrl", "agreedToConstitution"] as const;

export function Step4Verification({ form, onNext, onBack, formData, setFormData }: Step4VerificationProps) {
  const { t } = useLanguage();
  const {
    formState: { errors },
    watch,
    setValue,
  } = form;
  const voterIdRaw = watch("voterRegistrationNumber") ?? "";
  const normalized = normalizeVoterIdInput(voterIdRaw);
  const isValidVoterId = normalized.length === 20 && validateVoterId(normalized);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    const ok = await form.trigger(STEP4_FIELDS as unknown as (keyof EnrollmentFormData)[]);
    if (!ok) return;
    const values = form.getValues();
    setFormData(values);
    setIsSubmitting(true);
    const merged = { ...formData, ...values } as EnrollmentFormData;
    const result = await submitEnrollment(merged);
    setIsSubmitting(false);
    if (result.ok) {
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
    </form>
  );
}
