"use client";

import { UseFormReturn } from "react-hook-form";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import { useLanguage } from "@/lib/i18n/context";

interface Step2ContactProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

export function Step2Contact({ form, onNext, onBack }: Step2ContactProps) {
  const { t } = useLanguage();
  const {
    register,
    setValue,
    formState: { errors },
    watch,
  } = form;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <p className="text-sm text-neutral-600">{t.enrollment.step2.description}</p>
      <div className="space-y-2">
        <Label htmlFor="phone">{t.enrollment.step2.phoneLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.phoneHint}</p>
        <Input
          id="phone"
          type="tel"
          {...register("phone")}
          autoComplete="tel"
          valid={errors.phone ? false : watch("phone")?.length >= 10 ? true : undefined}
          placeholder={t.enrollment.step2.phonePlaceholder}
          aria-invalid={!!errors.phone}
        />
        {errors.phone && (
          <p className="text-sm text-red-600" role="alert">{errors.phone.message}</p>
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
        <Label htmlFor="dateOfBirth">{t.enrollment.step2.dobLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step2.dobHint}</p>
        <DatePicker
          id="dateOfBirth"
          value={watch("dateOfBirth")}
          onChange={(v) => setValue("dateOfBirth", v, { shouldValidate: true })}
          placeholder={t.enrollment.step2.dobPlaceholder}
          captionLayout="dropdown-buttons"
          min={new Date(1920, 0, 1)}
          max={new Date()}
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
    </form>
  );
}
