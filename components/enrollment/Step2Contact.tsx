"use client";

import { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useLanguage } from "@/lib/i18n/context";
import { format } from "date-fns";
import { getDobBounds } from "@/lib/enrollment-dates";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, Loader2 } from "lucide-react";

interface Step2ContactProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

export function Step2Contact({ form, onNext, onBack }: Step2ContactProps) {
  const { t } = useLanguage();
  const dobMin = format(getDobBounds().min, "yyyy-MM-dd");
  const dobMax = format(getDobBounds().max, "yyyy-MM-dd");
  const {
    register,
    setValue,
    formState: { errors },
    watch,
  } = form;

  // Register hidden field so RHF tracks it
  useEffect(() => {
    register("phoneVerified");
  }, [register]);

  const phone = watch("phone") ?? "";
  const phoneVerified = watch("phoneVerified") ?? false;

  const [otpOpen, setOtpOpen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pinId, setPinId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpMessage, setOtpMessage] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const friendlyOtpError =
    "System couldn't verify your phone number at the moment. You can proceed to register and an SDP representative will reach out to verify your membership.";

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendIn]);

  const handlePhoneChange = (value: string) => {
    setValue("phone", value, { shouldValidate: true });
    // Changing the phone clears verification
    if (phoneVerified) {
      setValue("phoneVerified", false, { shouldValidate: true });
    }
  };

  const handleSendCode = async () => {
    if (!phone) {
      setOtpError("Enter your phone number first.");
      return;
    }
    setSending(true);
    setOtpError(null);
    setOtpMessage(null);
    try {
      const res = await fetch("/api/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.warn("[OTP] send error:", data.error);
        setOtpError(friendlyOtpError);
      } else {
        setOtpMessage("Code sent. Check your phone.");
        setOtpOpen(true);
        setResendIn(30);
        setOtpCode("");
        setPinId(data.pinId ?? null);
      }
    } catch (err) {
      console.error(err);
      setOtpError("Could not send code. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async () => {
    if (!otpCode) {
      setOtpError("Enter the code you received.");
      return;
    }
    if (!pinId) {
      setOtpError("Missing code session. Please resend the code.");
      return;
    }
    setVerifying(true);
    setOtpError(null);
    try {
      const res = await fetch("/api/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: otpCode, pinId }),
      });
      const data = await res.json();
      if (!data.ok) {
        console.warn("[OTP] verify error:", data.error);
        setOtpError(friendlyOtpError);
      } else {
        setValue("phoneVerified", true, { shouldValidate: true });
        setOtpMessage("Phone verified.");
        setOtpOpen(false);
      }
    } catch (err) {
      console.error(err);
      setOtpError("Verification failed. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <p className="text-sm text-neutral-600">{t.enrollment.step2.description}</p>
      <input type="hidden" {...register("phoneVerified")} />
      <div className="space-y-2">
        <Label htmlFor="phone">{t.enrollment.step2.phoneLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.phoneHint}</p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => handlePhoneChange(e.target.value)}
              autoComplete="tel"
              disabled={phoneVerified}
              valid={errors.phone ? false : phone?.length >= 10 ? true : undefined}
              placeholder={t.enrollment.step2.phonePlaceholder}
              aria-invalid={!!errors.phone}
            />
            <div className="flex items-center gap-2 text-xs">
              {phoneVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-100">
                  <Check className="h-3 w-3" /> Verified
                </span>
              ) : (
                <span className="text-neutral-500">Not verified</span>
              )}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="min-w-[140px]"
            onClick={handleSendCode}
            disabled={sending || phoneVerified}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : phoneVerified ? "Verified" : "Send code"}
          </Button>
        </div>
        {errors.phone && (
          <p className="text-sm text-red-600" role="alert">{errors.phone.message}</p>
        )}
        {otpMessage && !otpError && (
          <p className="text-sm text-emerald-700" role="status">{otpMessage}</p>
        )}
        {otpError && (
          <p className="text-sm text-red-600" role="alert">{otpError}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{t.enrollment.step2.emailLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.emailHint}</p>
        <Input
          id="email"
          type="email"
          {...register("email")}
          autoComplete="email"
          valid={errors.email ? false : watch("email") ? true : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-red-600" role="alert">{errors.email.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">{t.enrollment.step2.addressLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.addressHint}</p>
        <Input
          id="address"
          {...register("address")}
          autoComplete="street-address"
          valid={errors.address ? false : watch("address") ? true : undefined}
          aria-invalid={!!errors.address}
          placeholder={t.enrollment.step2.addressPlaceholder}
        />
        {errors.address && (
          <p className="text-sm text-red-600" role="alert">{errors.address.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="dateOfBirth">{t.enrollment.step2.dobLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.dobHint}</p>
        <DatePicker
          id="dateOfBirth"
          value={watch("dateOfBirth")}
          onChange={(v) => setValue("dateOfBirth", v, { shouldValidate: true })}
          placeholder={t.enrollment.step2.dobPlaceholder}
          captionLayout="dropdown-buttons"
          min={dobMin}
          max={dobMax}
          valid={errors.dateOfBirth ? false : watch("dateOfBirth") ? true : undefined}
          aria-invalid={!!errors.dateOfBirth}
        />
        {errors.dateOfBirth && (
          <p className="text-sm text-red-600" role="alert">{errors.dateOfBirth.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 min-h-[44px]">
          {t.enrollment.step2.back}
        </Button>
        <Button type="submit" className="flex-1 min-h-[44px]">
          {t.enrollment.step2.continue}
        </Button>
      </div>

      <Dialog open={otpOpen} onOpenChange={setOtpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify your phone</DialogTitle>
            <DialogDescription>
              Enter the 6-digit code we sent to {phone || "your phone"}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Label htmlFor="otp">6-digit code</Label>
            <Input
              id="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
            />
            {otpError && (
              <p className="text-sm text-red-600" role="alert">{otpError}</p>
            )}
            {otpMessage && !otpError && (
              <p className="text-sm text-emerald-700" role="status">{otpMessage}</p>
            )}
            <div className="text-xs text-neutral-500">
              {resendIn > 0 ? `Resend available in ${resendIn}s` : "You can request a new code if needed."}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOtpOpen(false)}
            >
              Cancel
            </Button>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={handleSendCode}
                disabled={sending || resendIn > 0}
              >
                {sending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : "Resend code"}
              </Button>
              <Button type="button" onClick={handleVerify} disabled={verifying}>
                {verifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying…
                  </>
                ) : "Verify"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </form>
  );
}
