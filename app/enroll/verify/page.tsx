"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Hash, CreditCard, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MemberRecord } from "@/lib/mock-members";
import { getMembershipIdFromData, formatVoterIdDisplay } from "@/lib/enrollment-schema";
import { verifyByMembershipId, verifyByVoterId } from "@/app/actions/verification";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/context";

type VerifyMethod = "membership-id" | "voter-id";

function getStateName(stateId: string): string {
  return NIGERIA_STATES.find((s) => s.id === stateId)?.name ?? stateId;
}

export default function VerifyPage() {
  const { t } = useLanguage();
  const [method, setMethod] = useState<VerifyMethod>("membership-id");
  const [membershipIdInput, setMembershipIdInput] = useState("");
  const [voterIdInput, setVoterIdInput] = useState("");
  const [result, setResult] = useState<MemberRecord | "not-found" | null>(null);
  const [searched, setSearched] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    setSearched(true);
    setResult(null);
    setErrorMessage(null);

    try {
      const res =
        method === "membership-id"
          ? await verifyByMembershipId(membershipIdInput)
          : await verifyByVoterId(voterIdInput);

      if (res.ok) {
        setResult(res.member);
        setErrorMessage(null);
      } else {
        setResult("not-found");
        setErrorMessage(res.error);
      }
    } catch (error) {
      setResult("not-found");
      setErrorMessage("An unexpected error occurred. Please try again.");
      console.error("[VERIFY] Error:", error);
    } finally {
      setIsVerifying(false);
    }
  };

  const reset = () => {
    setResult(null);
    setSearched(false);
    setMembershipIdInput("");
    setVoterIdInput("");
    setErrorMessage(null);
  };

  return (
    <main className="min-h-screen bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="h-4 w-4" />
            {t.common.back} {t.verify.title}
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">
            {t.verify.title}
          </h1>
          <p className="mt-1 text-sm text-neutral-600">
            {t.verify.subtitle}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-4 py-6 pb-24">
        {/* Method tabs */}
        <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
          <button
            type="button"
            onClick={() => { setMethod("membership-id"); reset(); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
              method === "membership-id"
                ? "bg-sdp-primary text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            <Hash className="h-4 w-4" />
            {t.verify.membershipId}
          </button>
          <button
            type="button"
            onClick={() => { setMethod("voter-id"); reset(); }}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-md py-2.5 text-sm font-medium transition-colors",
              method === "voter-id"
                ? "bg-sdp-primary text-white"
                : "text-neutral-600 hover:bg-neutral-100"
            )}
          >
            <CreditCard className="h-4 w-4" />
            {t.verify.voterId}
          </button>
        </div>

        <form className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm" onSubmit={onVerify}>
          {method === "membership-id" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="membership-id">{t.verify.membershipId}</Label>
                <Input
                  id="membership-id"
                  type="text"
                  placeholder={t.verify.membershipIdPlaceholder}
                  value={membershipIdInput}
                  onChange={(e) => setMembershipIdInput(e.target.value.toUpperCase())}
                  className="mt-1.5 font-mono"
                  aria-describedby="membership-id-hint"
                  disabled={isVerifying}
                />
                <p id="membership-id-hint" className="mt-1 text-xs text-neutral-500">
                  {t.verify.membershipIdHint}
                </p>
              </div>
              <Button type="submit" disabled={isVerifying} className="w-full min-h-[44px]" aria-label="Verify by Membership ID">
                {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                {isVerifying ? t.verify.verifying : t.verify.verify}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="voter-id">{t.verify.voterId}</Label>
                <Input
                  id="voter-id"
                  type="text"
                  placeholder={t.verify.voterIdPlaceholder}
                  value={voterIdInput}
                  onChange={(e) => setVoterIdInput(e.target.value)}
                  className="mt-1.5 font-mono tracking-wider"
                  maxLength={24}
                  aria-describedby="voter-id-hint"
                  disabled={isVerifying}
                />
                <p id="voter-id-hint" className="mt-1 text-xs text-neutral-500">
                  {t.verify.voterIdHint}
                </p>
              </div>
              <Button type="submit" disabled={isVerifying} className="w-full min-h-[44px]" aria-label="Verify by Voter ID">
                {isVerifying ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                {isVerifying ? t.verify.verifying : t.verify.verify}
              </Button>
            </div>
          )}
        </form>

        {/* Result */}
        {searched && result !== null && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
            {result === "not-found" ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="rounded-full bg-red-100 p-3">
                  <ShieldCheck className="h-8 w-8 text-red-600" aria-hidden />
                </div>
                <p className="font-medium text-neutral-900">{t.verify.memberNotFound}</p>
                {errorMessage ? (
                  <p className="text-sm text-neutral-600">{errorMessage}</p>
                ) : (
                  <p className="text-sm text-neutral-600">
                    {t.verify.memberNotFoundDesc.replace("{method}", method === "membership-id" ? t.verify.membershipId : t.verify.voterId)}
                  </p>
                )}
                <Button variant="outline" onClick={reset}>{t.common.back}</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sdp-accent">
                  <ShieldCheck className="h-5 w-5" />
                  <span className="font-semibold">{t.verify.memberVerified}</span>
                </div>
                
                {/* Photo and Name Display - Similar to Badge */}
                <div className="flex items-center gap-4 p-4 bg-neutral-50 rounded-lg border border-neutral-200">
                  {/* Photo */}
                  <div className="w-24 h-24 rounded-md overflow-hidden bg-neutral-200 border-2 border-[#01a85a] shrink-0">
                    {result.portraitDataUrl ? (
                      <img
                        src={result.portraitDataUrl}
                        alt="Member photo"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-neutral-400 text-xs">
                        {t.memberCard.photo}
                      </div>
                    )}
                  </div>
                  
                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xl font-bold text-neutral-900 uppercase tracking-wide leading-tight break-words">
                      {[result.title, result.surname, result.firstName, result.otherNames].filter(Boolean).join(" ")}
                    </p>
                    <p className="mt-1 text-sm text-neutral-600">
                      <span className="text-[#f48735] font-semibold">{t.memberCard.membershipId}: </span>
                      <span className="text-[#e0762a] font-bold font-mono">
                        {getMembershipIdFromData(result)}
                      </span>
                    </p>
                  </div>
                </div>
                
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-neutral-500">{t.verify.voterRegistration}</dt>
                    <dd className="font-mono text-neutral-900">
                      {formatVoterIdDisplay(result.voterRegistrationNumber || "")}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">{t.verify.state}</dt>
                    <dd className="text-neutral-900">{getStateName(result.state)}</dd>
                  </div>
                  {result.phone && (
                    <div>
                      <dt className="text-neutral-500">{t.verify.phone}</dt>
                      <dd className="text-neutral-900">{result.phone}</dd>
                    </div>
                  )}
                </dl>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const text = `Verified SDP member: ${getMembershipIdFromData(result)}. Official SDP Portal.`;
                      if (navigator.share) {
                        try { await navigator.share({ title: "SDP Member Verified", text }); } catch { navigator.clipboard?.writeText(text); }
                      } else { navigator.clipboard?.writeText(text); }
                    }}
                    className="w-full min-h-[44px]"
                  >
                    <Share2 className="h-5 w-5" />
                    {t.verify.shareVerification}
                  </Button>
                  <Button variant="outline" onClick={reset} className="w-full">{t.verify.verifyAnother}</Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
