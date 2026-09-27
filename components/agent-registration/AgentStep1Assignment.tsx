"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  AGENT_LEVELS,
  AGENT_LEVEL_LABELS,
  AGENT_LEVEL_NAME_LABELS,
  type AgentLevel,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { LocationPicker } from "./LocationPicker";
import type { AgentStepProps } from "./types";

/** Drop location parts deeper than the chosen level so stale picks aren't kept. */
function trimToLevel(loc: LocationPick, level: AgentLevel): LocationPick {
  const next = { ...loc, code: "" };
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

export function AgentStep1Assignment({ draft, update, errors }: AgentStepProps) {
  const level = draft.agentLevel;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-base font-semibold text-neutral-900">What type of agent are you?</h2>
        <p className="text-sm text-neutral-600">Tick only one box.</p>
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Agent type">
          {AGENT_LEVELS.map((l) => {
            const selected = level === l;
            return (
              <button
                key={l}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() =>
                  update({ agentLevel: l, assignment: trimToLevel(draft.assignment, l) })
                }
                className={cn(
                  "flex min-h-[56px] items-center gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-colors",
                  selected
                    ? "border-sdp-primary bg-sdp-primary/5"
                    : "border-neutral-200 hover:border-sdp-primary/40"
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded border-2",
                    selected ? "border-sdp-primary bg-sdp-primary text-white" : "border-neutral-300"
                  )}
                  aria-hidden
                >
                  {selected ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <span className="text-sm font-medium text-neutral-900">{AGENT_LEVEL_LABELS[l]}</span>
              </button>
            );
          })}
        </div>
        {errors.agentLevel ? (
          <p className="text-sm text-red-600" role="alert">
            {errors.agentLevel}
          </p>
        ) : null}
      </div>

      {level ? (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
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
    </div>
  );
}
