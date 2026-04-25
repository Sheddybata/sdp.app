"use client";

import { useEffect, useMemo, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { useInecGeo } from "@/hooks/useInecGeo";
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
import { format } from "date-fns";
import { JOIN_YEAR_MIN, getJoinMonthYearMax, isValidJoinMonthYearIso } from "@/lib/enrollment-dates";
import { useLanguage } from "@/lib/i18n/context";

function range(lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = lo; i <= hi; i++) out.push(i);
  return out;
}

function monthsForYear(year: number): number[] {
  const { year: yMax, month: mMax } = getJoinMonthYearMax();
  if (year < JOIN_YEAR_MIN || year > yMax) return [];
  if (year === JOIN_YEAR_MIN && year === yMax) return range(1, mMax);
  if (year === JOIN_YEAR_MIN) return range(1, 12);
  if (year === yMax) return range(1, mMax);
  return range(1, 12);
}

function parseJoinIso(iso: string | undefined): { y: number; m: number } {
  const { year: yMax, month: mMax } = getJoinMonthYearMax();
  if (iso && /^\d{4}-\d{2}-01$/.test(iso) && isValidJoinMonthYearIso(iso)) {
    const [ys, ms] = iso.split("-");
    return { y: Number(ys), m: Number(ms) };
  }
  return { y: yMax, m: mMax };
}

function toJoinIso(y: number, m: number): string {
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

const MANUAL_POLLING_VALUE = "__manual__";

interface Step3GeographyProps {
  form: UseFormReturn<EnrollmentFormData>;
  onNext: () => void;
  onBack: () => void;
  formData: Partial<EnrollmentFormData>;
  setFormData: (d: Partial<EnrollmentFormData>) => void;
}

export function Step3Geography(props: Step3GeographyProps) {
  const { form, onNext, onBack } = props;
  const { t } = useLanguage();
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form;

  const stateId = watch("state");
  const lgaId = watch("lga");
  const wardId = watch("ward");

  const { states, loading, stateData, stateDataLoading } = useInecGeo(stateId);
  const [manualPollingMode, setManualPollingMode] = useState(false);

  const lgas = stateData?.lgas ?? [];
  const lga = lgas.find((l) => l.id === lgaId) ?? lgas.find((l) => l.name === lgaId);
  const wards = lga?.wards ?? [];
  const ward = wards.find((w) => w.id === wardId) ?? wards.find((w) => w.name === wardId);
  const pollingUnitOptions = ward?.pollingUnits ?? [];

  const joinIso = watch("joinDate");
  const { y: joinY, m: joinM } = useMemo(() => parseJoinIso(joinIso), [joinIso]);
  const { year: maxJoinYear } = getJoinMonthYearMax();
  const yearOptions = useMemo(
    () => range(JOIN_YEAR_MIN, maxJoinYear),
    [maxJoinYear]
  );
  const monthOptions = useMemo(() => monthsForYear(joinY), [joinY]);

  useEffect(() => {
    if (!stateId) {
      setValue("lga", "");
      setValue("ward", "");
      setValue("pollingUnit", "");
      setManualPollingMode(false);
      return;
    }
    setValue("lga", "");
    setValue("ward", "");
    setValue("pollingUnit", "");
    setManualPollingMode(false);
  }, [stateId, setValue]);

  useEffect(() => {
    if (!lgaId) {
      setValue("ward", "");
      setValue("pollingUnit", "");
      setManualPollingMode(false);
      return;
    }
    setValue("ward", "");
    setValue("pollingUnit", "");
    setManualPollingMode(false);
  }, [lgaId, setValue]);

  useEffect(() => {
    if (!wardId) {
      setValue("pollingUnit", "");
      setManualPollingMode(false);
    }
  }, [wardId, setValue]);

  /** Keep join month valid when year or bounds change */
  useEffect(() => {
    const months = monthsForYear(joinY);
    if (months.length === 0) return;
    if (!months.includes(joinM)) {
      setValue("joinDate", toJoinIso(joinY, months[months.length - 1]), { shouldValidate: true });
    }
  }, [joinY, joinM, setValue]);

  const loadingWardOrUnits = stateId && stateDataLoading;
  const showPollingUnitSelect = pollingUnitOptions.length > 0;
  const currentPollingUnit = watch("pollingUnit") ?? "";

  useEffect(() => {
    if (
      showPollingUnitSelect &&
      currentPollingUnit &&
      !pollingUnitOptions.some((unit) => unit.name === currentPollingUnit)
    ) {
      setManualPollingMode(true);
    }
  }, [showPollingUnitSelect, currentPollingUnit, pollingUnitOptions]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onNext(); }} className="space-y-6">
      <p className="text-sm text-neutral-600">{t.enrollment.step3.description}</p>
      <div className="space-y-2">
        <span id="joinDate-label" className="text-sm font-medium text-neutral-900">
          {t.enrollment.step3.joinDateLabel}
        </span>
        <p className="text-xs text-neutral-500">{t.enrollment.step3.joinDateHint}</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="join-month" className="text-xs text-neutral-600">
              {t.enrollment.step3.joinMonthLabel}
            </Label>
            <Select
              value={String(joinM)}
              onValueChange={(v) => {
                const m = Number(v);
                setValue("joinDate", toJoinIso(joinY, m), { shouldValidate: true });
              }}
            >
              <SelectTrigger id="join-month" aria-labelledby="joinDate-label">
                <SelectValue placeholder={t.enrollment.step3.joinMonthPlaceholder} />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {format(new Date(2020, m - 1, 1), "MMMM")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="join-year" className="text-xs text-neutral-600">
              {t.enrollment.step3.joinYearLabel}
            </Label>
            <Select
              value={String(joinY)}
              onValueChange={(v) => {
                const y = Number(v);
                const months = monthsForYear(y);
                const nextM = months.includes(joinM) ? joinM : months[months.length - 1] ?? 1;
                setValue("joinDate", toJoinIso(y, nextM), { shouldValidate: true });
              }}
            >
              <SelectTrigger id="join-year" aria-labelledby="joinDate-label">
                <SelectValue placeholder={t.enrollment.step3.joinYearPlaceholder} />
              </SelectTrigger>
              <SelectContent className="max-h-[min(50vh,16rem)]">
                {yearOptions.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {errors.joinDate && (
          <p className="text-sm text-red-600" role="alert">{errors.joinDate.message}</p>
        )}
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
            {states.map((s) => (
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
          disabled={!stateId || stateDataLoading}
        >
          <SelectTrigger id="lga">
            <SelectValue
              placeholder={
                stateId && stateDataLoading
                  ? t.common.loading
                  : t.enrollment.step3.lgaPlaceholder
              }
            />
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
          value={wardId}
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

      <div className="space-y-2">
        <Label htmlFor="pollingUnit">{t.enrollment.step3.pollingUnitLabel}</Label>
        {showPollingUnitSelect ? (
          <>
            <p className="text-xs text-neutral-500">{t.enrollment.step3.pollingUnitHint}</p>
            <Select
              value={
                (() => {
                  const current = watch("pollingUnit") ?? "";
                  const match = pollingUnitOptions.find((u) => u.name === current);
                  if (match) return match.id;
                  if (current) return MANUAL_POLLING_VALUE;
                  return "";
                })()
              }
              onValueChange={(v) => {
                if (v === MANUAL_POLLING_VALUE) {
                  setManualPollingMode(true);
                  setValue("pollingUnit", "", { shouldValidate: true });
                } else {
                  setManualPollingMode(false);
                  const name = pollingUnitOptions.find((u) => u.id === v)?.name ?? v;
                  setValue("pollingUnit", name, { shouldValidate: true });
                }
              }}
            >
              <SelectTrigger id="pollingUnit">
                <SelectValue placeholder={t.enrollment.step3.pollingUnitPlaceholder} />
              </SelectTrigger>
              <SelectContent className="max-h-[min(50vh,16rem)]">
                {pollingUnitOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
                <SelectItem value={MANUAL_POLLING_VALUE}>
                  {t.enrollment.step3.pollingUnitTypeManually}
                </SelectItem>
              </SelectContent>
            </Select>
            {!manualPollingMode ? (
              <p className="mt-1 text-xs text-neutral-500">{t.enrollment.step3.pollingUnitOrType}</p>
            ) : null}
            {manualPollingMode ? (
              <>
                <p className="mt-1 text-xs text-neutral-500">{t.enrollment.step3.pollingUnitOrType}</p>
                <Input
                  id="pollingUnitManual"
                  value={
                    pollingUnitOptions.some((u) => u.name === watch("pollingUnit"))
                      ? ""
                      : watch("pollingUnit") ?? ""
                  }
                  onChange={(e) =>
                    setValue("pollingUnit", e.target.value.trim(), { shouldValidate: true })
                  }
                  placeholder={t.enrollment.step3.pollingUnitPlaceholder}
                  valid={errors.pollingUnit ? false : watch("pollingUnit") ? true : undefined}
                  aria-invalid={!!errors.pollingUnit}
                  className="mt-1"
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <p className="text-xs text-neutral-500">
              {loadingWardOrUnits ? t.enrollment.step3.pollingUnitLoading : t.enrollment.step3.pollingUnitHint}
            </p>
            <Input
              id="pollingUnit"
              {...register("pollingUnit")}
              placeholder={t.enrollment.step3.pollingUnitPlaceholder}
              valid={errors.pollingUnit ? false : watch("pollingUnit") ? true : undefined}
              aria-invalid={!!errors.pollingUnit}
            />
          </>
        )}
        {errors.pollingUnit && (
          <p className="text-sm text-red-600" role="alert">{errors.pollingUnit.message}</p>
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
