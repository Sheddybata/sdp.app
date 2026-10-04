"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useInecGeo } from "@/hooks/useInecGeo";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { lookupLocationCode } from "@/app/actions/locationCodes";
import {
  EMPTY_LOCATION,
  isLocationComplete,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";

const DEPTH: Record<AgentLevel, number> = { state: 1, lga: 2, ward: 3, polling_unit: 4 };

export function LocationPicker({
  idPrefix,
  level,
  value,
  onChange,
  error,
}: {
  idPrefix: string;
  level: AgentLevel;
  value: LocationPick;
  onChange: (next: LocationPick) => void;
  error?: string;
}) {
  const depth = DEPTH[level];
  const { states, loading, stateData, stateDataLoading } = useInecGeo(value.stateId || undefined);
  const lgas = stateData?.lgas ?? [];
  const wards = lgas.find((l) => l.id === value.lgaId)?.wards ?? [];
  const pollingUnits = wards.find((w) => w.id === value.wardId)?.pollingUnits ?? [];
  const complete = isLocationComplete(value, level);
  const [lookingUp, setLookingUp] = useState(false);

  useEffect(() => {
    if (!complete) {
      setLookingUp(false);
      if (value.code) onChange({ ...value, code: "" });
      return;
    }
    let cancelled = false;
    setLookingUp(true);
    const idx = /-(\d+)$/.exec(value.pollingUnitId)?.[1];
    void lookupLocationCode({
      level,
      stateId: value.stateId,
      lgaId: value.lgaId || undefined,
      wardId: value.wardId || undefined,
      pollingUnitName: value.pollingUnitName || undefined,
      pollingUnitIndex: idx != null ? Number(idx) : undefined,
    })
      .catch(() => null)
      .then((code) => {
        if (cancelled) return;
        setLookingUp(false);
        if ((code ?? "") !== value.code) onChange({ ...value, code: code ?? "" });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete, level, value.stateId, value.lgaId, value.wardId, value.pollingUnitName]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-state`}>State</Label>
          <Select
            value={value.stateId || undefined}
            onValueChange={(id) =>
              onChange({
                ...EMPTY_LOCATION,
                stateId: id,
                stateName: states.find((s) => s.id === id)?.name ?? id,
              })
            }
            disabled={loading}
          >
            <SelectTrigger id={`${idPrefix}-state`} className="min-h-[44px]">
              <SelectValue placeholder={loading ? "Loading…" : "Select state"} />
            </SelectTrigger>
            <SelectContent className="max-h-[min(60vh,20rem)]">
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {depth >= 2 && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-lga`}>LGA</Label>
            <Select
              key={`lga-${value.stateId}`}
              value={value.lgaId || undefined}
              onValueChange={(id) =>
                onChange({
                  ...EMPTY_LOCATION,
                  stateId: value.stateId,
                  stateName: value.stateName,
                  lgaId: id,
                  lgaName: lgas.find((l) => l.id === id)?.name ?? id,
                })
              }
              disabled={!value.stateId || stateDataLoading}
            >
              <SelectTrigger id={`${idPrefix}-lga`} className="min-h-[44px]">
                <SelectValue
                  placeholder={value.stateId && stateDataLoading ? "Loading…" : "Select LGA"}
                />
              </SelectTrigger>
              <SelectContent className="max-h-[min(60vh,20rem)]">
                {lgas.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {depth >= 3 && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-ward`}>Ward</Label>
            <Select
              key={`ward-${value.lgaId}`}
              value={value.wardId || undefined}
              onValueChange={(id) =>
                onChange({
                  ...value,
                  wardId: id,
                  wardName: wards.find((w) => w.id === id)?.name ?? id,
                  pollingUnitId: "",
                  pollingUnitName: "",
                  code: "",
                })
              }
              disabled={!value.lgaId}
            >
              <SelectTrigger id={`${idPrefix}-ward`} className="min-h-[44px]">
                <SelectValue placeholder="Select ward" />
              </SelectTrigger>
              <SelectContent className="max-h-[min(60vh,20rem)]">
                {wards.map((w) => (
                  <SelectItem key={w.id} value={w.id}>
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {depth >= 4 && (
          <div className="space-y-1.5">
            <Label htmlFor={`${idPrefix}-pu`}>Polling unit</Label>
            <Select
              key={`pu-${value.wardId}`}
              value={value.pollingUnitId || undefined}
              onValueChange={(id) =>
                onChange({
                  ...value,
                  pollingUnitId: id,
                  pollingUnitName: pollingUnits.find((p) => p.id === id)?.name ?? "",
                })
              }
              disabled={!value.wardId || pollingUnits.length === 0}
            >
              <SelectTrigger id={`${idPrefix}-pu`} className="min-h-[44px]">
                <SelectValue
                  placeholder={
                    value.wardId && pollingUnits.length === 0
                      ? "No polling units listed — contact the secretariat"
                      : "Select polling unit"
                  }
                />
              </SelectTrigger>
              <SelectContent className="max-h-[min(50vh,16rem)]">
                {pollingUnits.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-code`}>Code (filled in automatically)</Label>
        <div className="relative">
          <Input
            id={`${idPrefix}-code`}
            value={value.code}
            readOnly
            tabIndex={-1}
            aria-readonly
            placeholder={
              !complete
                ? "Appears when you finish choosing above"
                : lookingUp
                  ? "Looking up code…"
                  : "Code not found — contact the SDP secretariat"
            }
            className="min-h-[44px] cursor-default bg-neutral-50 font-mono tracking-wide"
          />
          {lookingUp ? (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
