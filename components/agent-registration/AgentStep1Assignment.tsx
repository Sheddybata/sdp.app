"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AGENT_LEVEL_GROUPS,
  AGENT_LEVEL_LABELS,
  AGENT_LEVEL_NAME_LABELS,
  EMPTY_LOCATION,
  isConstituencyAgentLevel,
  usesAdminLocationPicker,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { LocationPicker } from "./LocationPicker";
import type { AgentStepProps } from "./types";
import { useInecGeo } from "@/hooks/useInecGeo";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listConstituenciesForLevel } from "@/app/actions/constituencies";
import type { ConstituencySeat } from "@/lib/constituency-types";

/** Drop location parts deeper than the chosen level so stale picks aren't kept. */
function trimToLevel(loc: LocationPick, level: AgentLevel): LocationPick {
  if (level === "national") {
    return {
      ...EMPTY_LOCATION,
      stateId: "national",
      stateName: "Nationwide",
      code: "NATIONAL",
    };
  }
  const next = { ...loc, code: "" };
  if (isConstituencyAgentLevel(level)) {
    next.lgaId = "";
    next.lgaName = "";
    next.wardId = "";
    next.wardName = "";
    next.pollingUnitId = "";
    next.pollingUnitName = "";
    return next;
  }
  if (level === "state") {
    next.lgaId = "";
    next.lgaName = "";
  }
  if (level === "state" || level === "lga") {
    next.wardId = "";
    next.wardName = "";
  }
  if (level !== "polling_unit") {
    next.pollingUnitId = "";
    next.pollingUnitName = "";
  }
  return next;
}

function ConstituencyAssignmentPicker({
  level,
  value,
  onChange,
  error,
}: {
  level: AgentLevel;
  value: LocationPick;
  onChange: (next: LocationPick) => void;
  error?: string;
}) {
  const { states, loading } = useInecGeo(undefined);
  const [seats, setSeats] = useState<ConstituencySeat[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!value.stateId || !isConstituencyAgentLevel(level)) {
      setSeats([]);
      return;
    }
    let cancelled = false;
    startTransition(() => {
      void listConstituenciesForLevel(level, value.stateId).then((list) => {
        if (!cancelled) setSeats(list);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [level, value.stateId]);

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>State</Label>
          <Select
            value={value.stateId || "_none"}
            onValueChange={(stateId) => {
              if (stateId === "_none") return;
              const st = states.find((s) => s.id === stateId);
              onChange({
                ...EMPTY_LOCATION,
                stateId,
                stateName: st?.name ?? "",
              });
            }}
            disabled={loading}
          >
            <SelectTrigger
              className={cn(error && !value.stateId && "border-red-500")}
              aria-invalid={!!error && !value.stateId}
            >
              <SelectValue placeholder={loading ? "Loading…" : "Select state"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled className="hidden">
                Select state
              </SelectItem>
              {states.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{AGENT_LEVEL_NAME_LABELS[level]}</Label>
          <Select
            value={value.code || "_none"}
            onValueChange={(code) => {
              if (code === "_none") return;
              const seat = seats.find((s) => s.code === code);
              onChange({
                ...value,
                code,
                pollingUnitId: code,
                pollingUnitName: seat?.name ?? code,
                lgaId: "",
                lgaName: "",
                wardId: "",
                wardName: "",
              });
            }}
            disabled={!value.stateId || pending}
          >
            <SelectTrigger
              className={cn(error && !value.code && "border-red-500")}
              aria-invalid={!!error && !value.code}
            >
              <SelectValue
                placeholder={
                  !value.stateId
                    ? "Select state first"
                    : pending
                      ? "Loading…"
                      : `Select ${AGENT_LEVEL_NAME_LABELS[level].toLowerCase()}`
                }
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="_none" disabled className="hidden">
                Select constituency
              </SelectItem>
              {seats.map((s) => (
                <SelectItem key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!pending && value.stateId && seats.length === 0 ? (
            <p className="text-xs text-amber-700">No constituencies found for this state.</p>
          ) : null}
        </div>
      </div>
      {value.code ? (
        <p className="flex items-center gap-2 text-xs text-neutral-600">
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Code: <span className="font-mono font-medium text-neutral-900">{value.code}</span>
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function AgentStep1Assignment({ draft, update, errors }: AgentStepProps) {
  const level = draft.agentLevel;

  return (
    <div className="space-y-6">
      <div id="agent-level-group" className="space-y-2">
        <h2 className="text-base font-semibold text-neutral-900">What type of agent are you?</h2>
        <p className="text-sm text-neutral-600">Tick only one box. One person may hold only one post.</p>
        <div
          className={cn(
            "space-y-5 rounded-xl p-1",
            errors.agentLevel && "ring-2 ring-red-500 ring-offset-2"
          )}
          role="radiogroup"
          aria-label="Agent type"
          aria-invalid={!!errors.agentLevel}
        >
          {AGENT_LEVEL_GROUPS.map((group) => (
            <div key={group.id} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                {group.title}
              </h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {group.levels.map((l) => {
                  const selected = level === l;
                  return (
                    <button
                      key={l}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() =>
                        update({
                          agentLevel: l,
                          assignment: trimToLevel(
                            l === "national" ? EMPTY_LOCATION : draft.assignment,
                            l
                          ),
                        })
                      }
                      className={cn(
                        "flex min-h-[56px] items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-colors",
                        selected
                          ? "border-sdp-primary bg-sdp-primary/5"
                          : errors.agentLevel
                            ? "border-red-300 hover:border-red-400"
                            : "border-neutral-200 hover:border-sdp-primary/40"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                          selected
                            ? "border-sdp-primary bg-sdp-primary text-white"
                            : "border-neutral-300"
                        )}
                        aria-hidden
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      </span>
                      <span className="text-sm font-medium text-neutral-900">
                        {AGENT_LEVEL_LABELS[l]}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {errors.agentLevel ? (
          <p className="text-sm text-red-600" role="alert">
            {errors.agentLevel}
          </p>
        ) : null}
      </div>

      {level === "national" ? (
        <div
          id="agent-assignment-section"
          className={cn(
            "space-y-3 rounded-xl border bg-white p-4 shadow-sm",
            errors.assignment ? "border-red-500" : "border-neutral-200"
          )}
        >
          <h3 className="text-sm font-semibold text-neutral-900">Nationwide post</h3>
          <p className="text-sm text-neutral-600">
            There is only one National Agent post. Code:{" "}
            <span className="font-mono font-medium text-neutral-900">NATIONAL</span>
          </p>
          {errors.assignment ? (
            <p className="text-sm text-red-600" role="alert">
              {errors.assignment}
            </p>
          ) : null}
        </div>
      ) : null}

      {level && usesAdminLocationPicker(level) ? (
        <div
          id="agent-assignment-section"
          className={cn(
            "space-y-3 rounded-xl border bg-white p-4 shadow-sm",
            errors.assignment ? "border-red-500" : "border-neutral-200"
          )}
        >
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              {AGENT_LEVEL_LABELS[level]}: {AGENT_LEVEL_NAME_LABELS[level]} and code
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Choose the {AGENT_LEVEL_NAME_LABELS[level].toLowerCase()} you will serve. The code is
              filled in for you.
            </p>
          </div>
          <LocationPicker
            idPrefix="assignment"
            level={level}
            value={draft.assignment}
            onChange={(assignment) => update({ assignment })}
            error={errors.assignment}
          />
        </div>
      ) : null}

      {level && isConstituencyAgentLevel(level) ? (
        <div
          id="agent-assignment-section"
          className={cn(
            "space-y-3 rounded-xl border bg-white p-4 shadow-sm",
            errors.assignment ? "border-red-500" : "border-neutral-200"
          )}
        >
          <div>
            <h3 className="text-sm font-semibold text-neutral-900">
              {AGENT_LEVEL_LABELS[level]}: {AGENT_LEVEL_NAME_LABELS[level]} and code
            </h3>
            <p className="mt-0.5 text-xs text-neutral-500">
              Choose the constituency you will serve. The official INEC code is filled in for you.
            </p>
          </div>
          <ConstituencyAssignmentPicker
            level={level}
            value={draft.assignment}
            onChange={(assignment) => update({ assignment })}
            error={errors.assignment}
          />
        </div>
      ) : null}
    </div>
  );
}
