"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AGENT_DECLARATION_TEXT,
  AGENT_GENDERS,
  type AgentRegistrationDraft,
} from "@/lib/agent-registration-schema";
import { DocumentImageField } from "./DocumentImageField";
import type { AgentStepProps } from "./types";

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

export function AgentStep2Personal({ draft, update, errors }: AgentStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-neutral-900">Personal details</h3>
          <p className="mt-0.5 text-xs text-neutral-500">
            Enter your name, gender and phone. You will sign in with this phone number.
          </p>
        </div>
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
          <Field id="agent-middleName" label="Other names" error={errors.middleName} hint="Optional">
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
        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field
            id="agent-phone"
            label="Phone number"
            error={errors.phone}
            hint="Nigerian mobile — used to sign in after approval."
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
        </div>
      </div>

      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Profile photo</h2>
        <DocumentImageField
          id="agent-photo"
          label="Passport photo"
          hint="A clear, front-facing photo of your face."
          value={draft.photoDataUrl}
          onChange={(photoDataUrl) => update({ photoDataUrl })}
          error={errors.photoDataUrl}
          defaultFacing="user"
          maxSide={960}
        />
      </div>

      <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Acknowledgment</h2>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={draft.acknowledged}
            onChange={(e) => update({ acknowledged: e.target.checked })}
            className="mt-1 h-5 w-5 rounded border-neutral-300 text-sdp-primary focus:ring-sdp-primary"
          />
          <span className="text-sm text-neutral-800">{AGENT_DECLARATION_TEXT}</span>
        </label>
        {errors.acknowledged ? (
          <p className="pl-8 text-sm text-red-600" role="alert">
            {errors.acknowledged}
          </p>
        ) : null}
      </div>

      <div className="space-y-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <div>
          <h2 className="text-sm font-semibold text-neutral-900">Create your sign-in password</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            You will sign in with{" "}
            <span className="font-medium">{draft.phone || "your phone number"}</span> once the secretariat
            approves your registration.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="agent-password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="agent-password"
                type="password"
                value={draft.password}
                onChange={(e) => update({ password: e.target.value })}
                className="min-h-[44px] pl-10"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
              />
            </div>
            <p className="text-xs text-neutral-500">At least 8 characters.</p>
            {errors.password ? (
              <p className="text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="agent-confirm-password">Confirm password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <Input
                id="agent-confirm-password"
                type="password"
                value={draft.confirmPassword}
                onChange={(e) => update({ confirmPassword: e.target.value })}
                className="min-h-[44px] pl-10"
                autoComplete="new-password"
                aria-invalid={!!errors.confirmPassword}
              />
            </div>
            {errors.confirmPassword ? (
              <p className="text-sm text-red-600" role="alert">
                {errors.confirmPassword}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
