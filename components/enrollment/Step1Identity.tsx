"use client";

import { UseFormReturn } from "react-hook-form";
import { enrollmentSchema, type EnrollmentFormData } from "@/lib/enrollment-schema";
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
import { useLanguage } from "@/lib/i18n/context";

const TITLES = [
  "Mr", "Mrs", "Miss", "Ms", "Dr", "Prof", "Alh", "Chief",
  "Barr", "Pst", "Amb", "Maj", "Capt", "Lt", "Col", "Brig", "Gen",
  "Engr", "Elder", "Rev", "Ven", "Sir", "Dame", "Arc", "Pharm",
  "Hon", "Mallam", "Oba", "Emir", "Prince", "Prophet",
] as const;

interface Step1IdentityProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

export function Step1Identity({ form, onNext }: Step1IdentityProps) {
  const { t } = useLanguage();
  const {
    register,
    formState: { errors },
    setValue,
    watch,
  } = form;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <p className="text-sm text-neutral-600">{t.enrollment.step1.description}</p>
      <div className="space-y-2">
        <Label htmlFor="title">{t.enrollment.step1.titleLabel}</Label>
        <Select
          value={watch("title")}
          onValueChange={(v) => setValue("title", v as EnrollmentFormData["title"])}
        >
          <SelectTrigger id="title" className="w-full">
            <SelectValue placeholder={t.enrollment.step1.titlePlaceholder} />
          </SelectTrigger>
          <SelectContent>
            {TITLES.map((title) => (
              <SelectItem key={title} value={title}>
                {title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.title && (
          <p className="text-sm text-red-600" role="alert">{errors.title.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="surname">{t.enrollment.step1.surnameLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step1.surnameHint}</p>
        <Input
          id="surname"
          {...register("surname")}
          autoComplete="family-name"
          valid={errors.surname ? false : watch("surname") ? true : undefined}
          aria-invalid={!!errors.surname}
          aria-describedby={errors.surname ? "surname-error" : undefined}
        />
        {errors.surname && (
          <p id="surname-error" className="text-sm text-red-600" role="alert">
            {errors.surname.message}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="firstName">{t.enrollment.step1.firstNameLabel}</Label>
        <Input
          id="firstName"
          {...register("firstName")}
          autoComplete="given-name"
          valid={errors.firstName ? false : watch("firstName") ? true : undefined}
          aria-invalid={!!errors.firstName}
        />
        {errors.firstName && (
          <p className="text-sm text-red-600" role="alert">{errors.firstName.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="otherNames">{t.enrollment.step1.otherNamesLabel}</Label>
        <p className="text-xs text-neutral-500">{t.enrollment.step1.otherNamesHint}</p>
        <Input
          id="otherNames"
          {...register("otherNames")}
          autoComplete="additional-name"
        />
      </div>

      <div className="pt-4">
        <Button type="submit" className="w-full min-h-[44px]">
          {t.enrollment.step1.continue}
        </Button>
      </div>
    </form>
  );
}
