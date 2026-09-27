"use client";

import type { ReactNode } from "react";
import { format } from "date-fns";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getDobBounds } from "@/lib/enrollment-dates";
import { formatVoterIdDisplay, normalizeVoterIdInput } from "@/lib/enrollment-schema";
import {
  AGENT_GENDERS,
  AGENT_MARITAL_STATUSES,
  AGENT_RELIGIONS,
  isLocationComplete,
  type AgentRegistrationDraft,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { LocationPicker } from "./LocationPicker";
import type { AgentStepProps } from "./types";

type TextKey =
  | "firstName"
  | "middleName"
  | "surname"
  | "phone"
  | "email"
  | "sdpMembershipId";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint ? <p className="text-xs text-neutral-500">{hint}</p> : null}
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function ChoiceSelect({
  id,
  value,
  options,
  placeholder,
  onChange,
}: {
  id: string;
  value: string;
  options: readonly string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger id={id} className="min-h-[44px]">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function LocationCard({
  title,
  hint,
  idPrefix,
  value,
  onChange,
  error,
  copyLabel,
  copySource,
}: {
  title: string;
  hint: string;
  idPrefix: string;
  value: LocationPick;
  onChange: (v: LocationPick) => void;
  error?: string;
  copyLabel?: string;
  copySource?: LocationPick | null;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
        </div>
        {copyLabel && copySource ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-[36px]"
            onClick={() => onChange({ ...copySource })}
          >
            <Copy className="h-3.5 w-3.5" />
            {copyLabel}
          </Button>
        ) : null}
      </div>
      <LocationPicker
        idPrefix={idPrefix}
        level="polling_unit"
        value={value}
        onChange={onChange}
        error={error}
      />
    </div>
  );
}

export function AgentStep2Personal({ draft, update, errors }: AgentStepProps) {
  const dobMin = format(getDobBounds().min, "yyyy-MM-dd");
  const dobMax = format(getDobBounds().max, "yyyy-MM-dd");

  const text = (key: TextKey) => ({
    id: `agent-${key}`,
    value: draft[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      update({ [key]: e.target.value } as Partial<AgentRegistrationDraft>),
    className: "min-h-[44px]",
    "aria-invalid": !!errors[key],
  });

  const assignmentAsPu =
    draft.agentLevel === "polling_unit" && isLocationComplete(draft.assignment, "polling_unit")
      ? draft.assignment
      : null;
  const agentPuDone = isLocationComplete(draft.agentPollingUnit, "polling_unit")
    ? draft.agentPollingUnit
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="agent-firstName" label="First name" error={errors.firstName}>
          <Input {...text("firstName")} autoComplete="given-name" />
        </Field>
        <Field id="agent-surname" label="Surname" error={errors.surname}>
          <Input {...text("surname")} autoComplete="family-name" />
        </Field>
        <Field id="agent-middleName" label="Middle name (optional)" error={errors.middleName}>
          <Input {...text("middleName")} autoComplete="additional-name" />
        </Field>
        <Field id="agent-dob" label="Date of birth" error={errors.dateOfBirth}>
          <DatePicker
            id="agent-dob"
            value={draft.dateOfBirth}
            onChange={(v) => update({ dateOfBirth: v })}
            placeholder="Select date"
            captionLayout="dropdown-buttons"
            min={dobMin}
            max={dobMax}
          />
        </Field>
        <Field id="agent-phone" label="Phone number" error={errors.phone}>
          <Input {...text("phone")} type="tel" inputMode="tel" placeholder="08012345678" autoComplete="tel" />
        </Field>
        <Field id="agent-gender" label="Gender" error={errors.gender}>
          <ChoiceSelect
            id="agent-gender"
            value={draft.gender}
            options={AGENT_GENDERS}
            placeholder="Select gender"
            onChange={(gender) => update({ gender })}
          />
        </Field>
        <Field
          id="agent-email"
          label="Email"
          error={errors.email}
          hint="You will use this email to sign in to the agent portal."
        >
          <Input {...text("email")} type="email" inputMode="email" autoComplete="email" />
        </Field>
        <Field
          id="agent-vin"
          label="Voter's identification number"
          error={errors.voterIdentificationNumber}
          hint="The 19 or 20-character number on your PVC."
        >
          <Input
            id="agent-vin"
            value={formatVoterIdDisplay(draft.voterIdentificationNumber)}
            onChange={(e) =>
              update({ voterIdentificationNumber: normalizeVoterIdInput(e.target.value).toUpperCase() })
            }
            placeholder="XXXX XXXX XXXX XXXX XXXX"
            maxLength={24}
            autoComplete="off"
            className="min-h-[44px] font-mono tracking-wider"
            aria-invalid={!!errors.voterIdentificationNumber}
          />
        </Field>
        <Field id="agent-marital" label="Marital status" error={errors.maritalStatus}>
          <ChoiceSelect
            id="agent-marital"
            value={draft.maritalStatus}
            options={AGENT_MARITAL_STATUSES}
            placeholder="Select marital status"
            onChange={(maritalStatus) => update({ maritalStatus })}
          />
        </Field>
        <Field id="agent-religion" label="Religion" error={errors.religion}>
          <ChoiceSelect
            id="agent-religion"
            value={draft.religion}
            options={AGENT_RELIGIONS}
            placeholder="Select religion"
            onChange={(religion) => update({ religion })}
          />
        </Field>
        <Field id="agent-sdpMembershipId" label="SDP membership ID" error={errors.sdpMembershipId}>
          <Input {...text("sdpMembershipId")} placeholder="As shown on your membership card" autoComplete="off" />
        </Field>
      </div>

      <LocationCard
        title="Agent's polling unit"
        hint="The polling unit you are attached to as an agent."
        idPrefix="agent-pu"
        value={draft.agentPollingUnit}
        onChange={(agentPollingUnit) => update({ agentPollingUnit })}
        error={errors.agentPollingUnit}
        copyLabel="Same as step 1"
        copySource={assignmentAsPu}
      />
      <LocationCard
        title="Agent voting unit"
        hint="Where you vote, as shown on your PVC."
        idPrefix="agent-vu"
        value={draft.agentVotingUnit}
        onChange={(agentVotingUnit) => update({ agentVotingUnit })}
        error={errors.agentVotingUnit}
        copyLabel="Click here if same as agent's polling unit"
        copySource={agentPuDone}
      />
      <LocationCard
        title="Polling unit (name/code)"
        hint="Polling unit name and code."
        idPrefix="agent-pollingunit"
        value={draft.pollingUnit}
        onChange={(pollingUnit) => update({ pollingUnit })}
        error={errors.pollingUnit}
        copyLabel="Click here if same as agent's polling unit"
        copySource={agentPuDone}
      />
    </div>
  );
}
