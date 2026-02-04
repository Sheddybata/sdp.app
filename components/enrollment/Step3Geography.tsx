"use client";

import { useEffect } from "react";
import { UseFormReturn } from "react-hook-form";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { useNigeriaGeo } from "@/hooks/useNigeriaGeo";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { DatePicker } from "@/components/ui/date-picker";
import { useLanguage } from "@/lib/i18n/context";

interface Step3GeographyProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

// Note: Function props (onNext, onBack) are valid between client components.
// Both EnrollmentWizard and Step3Geography are marked "use client", so this is safe.
// The Next.js 71007 warnings are false positives and can be ignored.
export function Step3Geography(props: Step3GeographyProps) {
  const { form, onNext, onBack, formData } = props;
  const { t } = useLanguage();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;
  const { states: nigeriaStates, loading } = useNigeriaGeo();

  const stateId = watch("state");
  const lgaId = watch("lga");

  useEffect(() => {
    setValue("joinDate", format(new Date(), "yyyy-MM-dd"));
  }, [setValue]);

  useEffect(() => {
    if (!stateId) {
      setValue("lga", "");
      setValue("ward", "");
      return;
    }
    setValue("lga", "");
    setValue("ward", "");
  }, [stateId, setValue]);

  useEffect(() => {
    if (!lgaId) {
      setValue("ward", "");
      return;
    }
    setValue("ward", "");
  }, [lgaId, setValue]);

  const state =
    nigeriaStates.find((s) => s.id === stateId) ??
    nigeriaStates.find(
      (s) => s.name.toLowerCase() === String(stateId).toLowerCase()
    );
  const lgas = state?.lgas ?? [];
  const lga =
    state?.lgas.find((l) => l.id === lgaId) ??
    state?.lgas.find(
      (l) => l.name.toLowerCase() === String(lgaId).toLowerCase()
    );
  const wards = lga?.wards ?? [];

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <p className="text-sm text-neutral-600">{t.enrollment.step3.description}</p>
      <div className="space-y-2">
        <Label htmlFor="joinDate">{t.enrollment.step3.joinDateLabel}</Label>
        <DatePicker
          id="joinDate"
          value={watch("joinDate")}
          onChange={(v) => setValue("joinDate", v)}
          placeholder={t.enrollment.step3.joinDatePlaceholder}
          captionLayout="dropdown-buttons"
          min={new Date(2020, 0, 1)}
          max={new Date()}
          aria-describedby="joinDate-desc"
        />
        <p id="joinDate-desc" className="text-xs text-neutral-500">
          {t.enrollment.step3.joinDateHint}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="state">{t.enrollment.step3.stateLabel}</Label>
        <Select
          value={stateId}
          onValueChange={(v) => setValue("state", v)}
          disabled={loading}
        >
          <SelectTrigger id="state">
            <SelectValue placeholder={loading ? t.common.loading : t.enrollment.step3.statePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {nigeriaStates.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.state && (
          <p className="text-sm text-red-600" role="alert">{errors.state.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="lga">{t.enrollment.step3.lgaLabel}</Label>
        <Select
          value={lgaId}
          onValueChange={(v) => setValue("lga", v)}
          disabled={!stateId}
        >
          <SelectTrigger id="lga">
            <SelectValue placeholder={t.enrollment.step3.lgaPlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {lgas.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.lga && (
          <p className="text-sm text-red-600" role="alert">{errors.lga.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="ward">{t.enrollment.step3.wardLabel}</Label>
        <Select
          key={`ward-${lgaId || "none"}`}
          value={watch("ward")}
          onValueChange={(v) => setValue("ward", v)}
          disabled={!lgaId}
        >
          <SelectTrigger id="ward">
            <SelectValue placeholder={t.enrollment.step3.wardPlaceholder} />
          </SelectTrigger>
          <SelectContent className="max-h-[min(60vh,20rem)]">
            {wards.map((w) => (
              <SelectItem key={w.id} value={w.id}>
                {w.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.ward && (
          <p className="text-sm text-red-600" role="alert">{errors.ward.message}</p>
        )}
      </div>

      <div className="flex gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onBack} className="flex-1 min-h-[44px]">
          {t.enrollment.step3.back}
        </Button>
        <Button type="submit" className="flex-1 min-h-[44px]">
          {t.enrollment.step3.continue}
        </Button>
      </div>
    </form>
  );
}

