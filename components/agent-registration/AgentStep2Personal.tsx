"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { BadgeCheck, Copy, Loader2, Lock } from "lucide-react";
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
import { formatVoterIdDisplay, normalizeVoterIdInput } from "@/lib/enrollment-schema";
import {
  AGENT_GENDERS,
  isLocationComplete,
  normalizeMembershipId,
  type AgentMembershipPath,
  type AgentRegistrationDraft,
  type LocationPick,
} from "@/lib/agent-registration-schema";
import { checkAgentMembership } from "@/app/actions/agentRegistration";
import { LocationPicker } from "./LocationPicker";
import type { AgentStepProps } from "./types";
import { cn } from "@/lib/utils";

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

function LockedName({ id, label, value, optional }: { id: string; label: string; value: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          value={value}
          readOnly
          tabIndex={-1}
          aria-readonly
          placeholder={optional ? "—" : "Filled in from your membership record"}
          className="min-h-[44px] cursor-default bg-neutral-50 pr-9"
        />
        <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" aria-hidden />
      </div>
    </div>
  );
}

export function AgentStep2Personal({ draft, update, errors }: AgentStepProps) {
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const isMember = draft.membershipPath === "member";

  const verified =
    isMember &&
    !!draft.memberVerifiedId &&
    draft.memberVerifiedId === normalizeMembershipId(draft.sdpMembershipId);

  const setPath = (membershipPath: AgentMembershipPath) => {
    setCheckError(null);
    update({
      membershipPath,
      sdpMembershipId: "",
      memberVerifiedId: "",
      firstName: "",
      middleName: "",
      surname: "",
      gender: "",
      membershipIdCardDataUrl: "",
    });
  };

  const onMembershipIdChange = (value: string) => {
    setCheckError(null);
    update(
      draft.memberVerifiedId
        ? { sdpMembershipId: value, memberVerifiedId: "", firstName: "", middleName: "", surname: "" }
        : { sdpMembershipId: value }
    );
  };

  const checkMembership = async () => {
    if (checking) return;
    const id = normalizeMembershipId(draft.sdpMembershipId);
    if (!id) {
      setCheckError("Enter the membership ID on your SDP membership card.");
      return;
    }
    setChecking(true);
    setCheckError(null);
    const result = await checkAgentMembership(id).catch(() => ({
      ok: false as const,
      error: "Could not reach the server. Check your connection and try again.",
    }));
    setChecking(false);
    if (!result.ok) {
      setCheckError(result.error);
      return;
    }
    update({
      sdpMembershipId: result.membershipId,
      memberVerifiedId: normalizeMembershipId(result.membershipId),
      firstName: result.firstName,
      middleName: result.middleName,
      surname: result.surname,
    });
  };

  const assignmentAsPu =
    draft.agentLevel === "polling_unit" && isLocationComplete(draft.assignment, "polling_unit")
      ? draft.assignment
      : null;
  const agentPuDone = isLocationComplete(draft.agentPollingUnit, "polling_unit")
    ? draft.agentPollingUnit
    : null;

  const membershipError = checkError ?? errors.sdpMembershipId;
  const fullName = [draft.firstName, draft.middleName, draft.surname].filter(Boolean).join(" ");

  return (
    <div className="space-y-6">
      <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">SDP membership</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Members verify their membership ID. Non-members can still apply with their name, gender and
            phone — photo, PVC and NIN are required either way.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["member", "I am an SDP member"],
              ["non_member", "I am not a member yet"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPath(value)}
              className={cn(
                "min-h-[44px] rounded-lg border px-3 text-sm font-medium transition-colors",
                draft.membershipPath === value
                  ? "border-sdp-primary bg-sdp-primary/10 text-sdp-primary"
                  : "border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50"
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {isMember ? (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="agent-sdpMembershipId">SDP membership ID</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="agent-sdpMembershipId"
                  value={draft.sdpMembershipId}
                  onChange={(e) => onMembershipIdChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void checkMembership();
                    }
                  }}
                  placeholder="e.g. 17-09-11-AA123"
                  autoComplete="off"
                  autoCapitalize="characters"
                  className="min-h-[44px] flex-1 font-mono uppercase tracking-wide"
                  aria-invalid={!!membershipError}
                />
                <Button
                  type="button"
                  className={
                    verified
                      ? "min-h-[44px] bg-sdp-accent text-white hover:bg-sdp-accent"
                      : "min-h-[44px] bg-sdp-primary text-white hover:bg-sdp-primary/90"
                  }
                  onClick={checkMembership}
                  disabled={checking || verified}
                >
                  {checking ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : verified ? (
                    <BadgeCheck className="h-4 w-4" />
                  ) : null}
                  {verified ? "Verified" : checking ? "Checking…" : "Check membership"}
                </Button>
              </div>
            </div>

            {verified ? (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <p>
                  <span className="font-semibold">Verified SDP member:</span> {fullName}
                </p>
              </div>
            ) : membershipError ? (
              <div className="space-y-1">
                <p className="text-sm text-red-600" role="alert">
                  {membershipError}
                </p>
                <Link href="/enroll" className="text-sm font-medium text-sdp-primary underline underline-offset-2">
                  Not a member yet? Register as an SDP member
                </Link>
              </div>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-3">
              <LockedName id="agent-firstName" label="First name" value={draft.firstName} />
              <LockedName id="agent-middleName" label="Middle name" value={draft.middleName} optional={verified} />
              <LockedName id="agent-surname" label="Surname" value={draft.surname} />
            </div>
            <p className="text-xs text-neutral-500">
              Your name comes from the SDP membership register and appears on your agent ID card exactly as
              shown.
            </p>
          </>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field id="agent-firstName" label="First name" error={errors.firstName}>
                <Input
                  id="agent-firstName"
                  value={draft.firstName}
                  onChange={(e) => update({ firstName: e.target.value })}
                  className="min-h-[44px]"
                  autoComplete="given-name"
                  aria-invalid={!!errors.firstName}
                />
              </Field>
              <Field id="agent-middleName" label="Middle name" error={errors.middleName} hint="Optional">
                <Input
                  id="agent-middleName"
                  value={draft.middleName}
                  onChange={(e) => update({ middleName: e.target.value })}
                  className="min-h-[44px]"
                  autoComplete="additional-name"
                />
              </Field>
              <Field id="agent-surname" label="Surname" error={errors.surname}>
                <Input
                  id="agent-surname"
                  value={draft.surname}
                  onChange={(e) => update({ surname: e.target.value })}
                  className="min-h-[44px]"
                  autoComplete="family-name"
                  aria-invalid={!!errors.surname}
                />
              </Field>
            </div>
            <Field id="agent-gender" label="Gender" error={errors.gender}>
              <Select
                value={draft.gender || undefined}
                onValueChange={(gender) =>
                  update({ gender: gender as AgentRegistrationDraft["gender"] })
                }
              >
                <SelectTrigger id="agent-gender" className="min-h-[44px]" aria-invalid={!!errors.gender}>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  {AGENT_GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <p className="text-xs text-neutral-500">
              You can apply without an SDP membership ID. Upload photo, PVC and NIN in the next step.
            </p>
          </>
        )}
      </div>

      <Field
        id="agent-phone"
        label="Phone number"
        error={errors.phone}
        hint="You will use this phone number to sign in to the agent portal."
      >
        <Input
          id="agent-phone"
          value={draft.phone}
          onChange={(e) => update({ phone: e.target.value })}
          type="tel"
          inputMode="tel"
          placeholder="08012345678"
          autoComplete="tel"
          className="min-h-[44px]"
          aria-invalid={!!errors.phone}
        />
      </Field>

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Identification</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            The secretariat checks these against the PVC{isMember ? " and membership card" : ""} you upload
            in the next step.
          </p>
        </div>
        <Field
          id="agent-nin"
          label="National Identification Number (NIN)"
          error={errors.nin}
          hint="The 11-digit number on your NIN slip or national ID card."
        >
          <Input
            id="agent-nin"
            value={draft.nin}
            onChange={(e) => update({ nin: e.target.value.replace(/\D/g, "").slice(0, 11) })}
            placeholder="12345678901"
            inputMode="numeric"
            maxLength={11}
            autoComplete="off"
            className="min-h-[44px] font-mono tracking-wider"
            aria-invalid={!!errors.nin}
          />
        </Field>
        <Field
          id="agent-vin"
          label="Voter registration number (VIN)"
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
