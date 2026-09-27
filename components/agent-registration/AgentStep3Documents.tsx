"use client";

import { Lock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AGENT_DECLARATION_TEXT } from "@/lib/agent-registration-schema";
import { DocumentImageField } from "./DocumentImageField";
import type { AgentStepProps } from "./types";

export function AgentStep3Documents({ draft, update, errors }: AgentStepProps) {
  return (
    <div className="space-y-6">
      <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-neutral-900">Uploads</h2>
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
        <DocumentImageField
          id="agent-membership-card"
          label="SDP membership ID card"
          hint="Photo of your membership card with all details readable."
          value={draft.membershipIdCardDataUrl}
          onChange={(membershipIdCardDataUrl) => update({ membershipIdCardDataUrl })}
          error={errors.membershipIdCardDataUrl}
        />
        <DocumentImageField
          id="agent-pvc"
          label="PVC (Permanent Voter's Card)"
          hint="Front of your PVC with the voter number readable."
          value={draft.pvcDataUrl}
          onChange={(pvcDataUrl) => update({ pvcDataUrl })}
          error={errors.pvcDataUrl}
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
            You will sign in with <span className="font-medium">{draft.email || "your email"}</span> once
            the secretariat approves your registration.
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
