"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Loader2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberCardFitPreview } from "@/components/enrollment/MemberCardFitPreview";
import { verifyByMembershipId } from "@/app/actions/verification";
import { getMembershipIdDisplayForRecord } from "@/lib/enrollment-schema";
import type { MemberRecord } from "@/lib/mock-members";
import { useLanguage } from "@/lib/i18n/context";

function VerifyPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [membershipIdInput, setMembershipIdInput] = useState("");
  const [verifiedMember, setVerifiedMember] = useState<MemberRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const onVerify = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isVerifying) return;
    setIsVerifying(true);
    setSearched(true);
    setVerifiedMember(null);
    setNotFound(false);
    setErrorMessage(null);

    try {
      const res = await verifyByMembershipId(membershipIdInput);
      if (res.ok) {
        setVerifiedMember(res.member);
        setNotFound(false);
        setErrorMessage(null);
      } else {
        setNotFound(true);
        setErrorMessage(res.error);
      }
    } catch {
      setNotFound(true);
      setErrorMessage("An unexpected error occurred. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const reset = () => {
    setVerifiedMember(null);
    setNotFound(false);
    setSearched(false);
    setMembershipIdInput("");
    setErrorMessage(null);
  };

  // Deep link: /enroll/verify?member=... (e.g. from membership card QR)
  useEffect(() => {
    const member = searchParams.get("member");
    if (!member) return;
    const cleaned = decodeURIComponent(member).replace(/\s/g, "").trim();
    if (cleaned.length < 6) return;
    setMembershipIdInput(cleaned.toUpperCase());
    setSearched(true);
    setIsVerifying(true);
    setVerifiedMember(null);
    setNotFound(false);
    setErrorMessage(null);
    verifyByMembershipId(cleaned)
      .then((res) => {
        if (res.ok) {
          setVerifiedMember(res.member);
          setNotFound(false);
          setErrorMessage(null);
        } else {
          setNotFound(true);
          setErrorMessage(res.error);
        }
      })
      .catch(() => {
        setNotFound(true);
        setErrorMessage("An unexpected error occurred. Please try again.");
      })
      .finally(() => setIsVerifying(false));
  }, [searchParams]);

  const verified = searched && verifiedMember !== null && !notFound;

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
          <h1 className="mt-2 text-xl font-semibold text-neutral-900">{t.verify.title}</h1>
          <p className="mt-1 text-sm text-neutral-600">{t.verify.subtitle}</p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-6 pb-24">
        <form
          className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm"
          onSubmit={onVerify}
        >
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
                autoComplete="off"
                spellCheck={false}
              />
              <p id="membership-id-hint" className="mt-1 text-xs text-neutral-500">
                {t.verify.membershipIdHint}
              </p>
            </div>
            <Button
              type="submit"
              disabled={isVerifying}
              className="min-h-[44px] w-full"
              aria-label="Verify membership registration number"
            >
              {isVerifying ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
              {isVerifying ? t.verify.verifying : t.verify.verify}
            </Button>
          </div>
        </form>

        {searched && (verified || notFound) && (
          <div className="mt-6 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm sm:p-6">
            {notFound ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <div className="rounded-full bg-red-100 p-3">
                  <ShieldCheck className="h-8 w-8 text-red-600" aria-hidden />
                </div>
                <p className="font-medium text-neutral-900">{t.verify.memberNotFound}</p>
                <p className="text-sm text-neutral-600">
                  {errorMessage ?? t.verify.memberNotFoundDesc}
                </p>
                <Button variant="outline" onClick={reset}>
                  {t.common.back}
                </Button>
              </div>
            ) : (
              verifiedMember && (
                <div className="space-y-6">
                  <div className="flex items-center gap-2 text-sdp-accent">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="font-semibold">{t.verify.memberVerified}</span>
                  </div>

                  <MemberCardFitPreview data={verifiedMember} showBarcode />

                  <div className="flex flex-col gap-2">
                    <Button
                      variant="outline"
                      onClick={async () => {
                        const id = getMembershipIdDisplayForRecord(verifiedMember);
                        const text = `Verified SDP membership. Registration number: ${id}.`;
                        if (navigator.share) {
                          try {
                            await navigator.share({ title: "SDP membership verified", text });
                          } catch {
                            await navigator.clipboard?.writeText(text);
                          }
                        } else {
                          await navigator.clipboard?.writeText(text);
                        }
                      }}
                      className="min-h-[44px] w-full"
                    >
                      <Share2 className="h-5 w-5" />
                      {t.verify.shareVerification}
                    </Button>
                    <Button variant="outline" onClick={reset} className="w-full">
                      {t.verify.verifyAnother}
                    </Button>
                  </div>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-neutral-50">
          <p className="text-neutral-500">Loading…</p>
        </main>
      }
    >
      <VerifyPageContent />
    </Suspense>
  );
}
