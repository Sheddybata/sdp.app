"use client";

import { useState, useEffect, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldCheck, Loader2, Share2, Download } from "lucide-react";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MemberCard } from "@/components/enrollment/MemberCard";
import { MemberCardBack } from "@/components/enrollment/MemberCardBack";
import { MemberCardFitPreview } from "@/components/enrollment/MemberCardFitPreview";
import { verifyByMembershipId } from "@/app/actions/verification";
import { getMembershipIdDisplayForRecord } from "@/lib/enrollment-schema";
import type { MemberRecord } from "@/lib/mock-members";
import { useLanguage } from "@/lib/i18n/context";
import { MEMBER_CARD_H, MEMBER_CARD_W } from "@/lib/member-card-back-content";
import {
  patchClonedMemberCardsForExport,
  waitForCaptureReady,
} from "@/lib/member-card-capture";

function safePdfFilenamePart(raw: string): string {
  const t = raw.replace(/\s+/g, "").replace(/[^a-zA-Z0-9_-]/g, "-");
  return t.length > 0 ? t.slice(0, 80) : "member";
}

function VerifyPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [membershipIdInput, setMembershipIdInput] = useState("");
  const [verifiedMember, setVerifiedMember] = useState<MemberRecord | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const previewRingClass = "ring-2 ring-sdp-primary/20";

  const html2canvasOpts = useMemo(
    () => ({
      scale: 2 as const,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
      onclone: (clonedDoc: Document) => {
        clonedDoc.querySelectorAll<HTMLElement>(".member-cards-capture-host").forEach((host) => {
          host.style.opacity = "1";
        });
        patchClonedMemberCardsForExport(clonedDoc);
      },
    }),
    []
  );

  const handleDownloadMembershipCardPdf = useCallback(async () => {
    if (!verifiedMember) return;
    const front = document.getElementById("member-card-capture");
    const back = document.getElementById("member-card-back-capture");
    if (!front || !back) return;
    setIsPdfLoading(true);
    try {
      const { default: html2canvas } = await import("html2canvas");
      await waitForCaptureReady();
      const [cFront, cBack] = await Promise.all([
        html2canvas(front as HTMLElement, html2canvasOpts),
        html2canvas(back as HTMLElement, html2canvasOpts),
      ]);
      const imgWidth = 280;
      const imgHeight = (cFront.height * imgWidth) / cFront.width;
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [imgWidth, imgHeight],
      });
      pdf.addImage(cFront.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      pdf.addPage();
      pdf.addImage(cBack.toDataURL("image/png"), "PNG", 0, 0, imgWidth, imgHeight);
      const fileId = safePdfFilenamePart(
        getMembershipIdDisplayForRecord(verifiedMember) ||
          verifiedMember.voterRegistrationNumber ||
          "member"
      );
      pdf.save(`SDP-MemberCard-${fileId}.pdf`);
    } catch (err) {
      console.error("Verify page PDF export failed:", err);
    } finally {
      setIsPdfLoading(false);
    }
  }, [verifiedMember, html2canvasOpts]);

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

                  <div
                    className="member-cards-capture-host pointer-events-none fixed left-0 z-0 flex flex-row items-start gap-4"
                    style={{
                      top: "100vh",
                      opacity: 0.004,
                      width: MEMBER_CARD_W,
                    }}
                    aria-hidden
                  >
                    <div className="flex shrink-0 flex-col gap-0" style={{ width: MEMBER_CARD_W }}>
                      <div
                        className="flex-none"
                        style={{
                          width: MEMBER_CARD_W,
                          height: MEMBER_CARD_H,
                          position: "relative",
                        }}
                      >
                        <MemberCard
                          data={verifiedMember}
                          showBarcode
                          id="member-card-capture"
                          className={previewRingClass}
                        />
                      </div>
                      <div
                        className="flex-none"
                        style={{
                          width: MEMBER_CARD_W,
                          height: MEMBER_CARD_H,
                          position: "relative",
                        }}
                      >
                        <MemberCardBack id="member-card-back-capture" className={previewRingClass} />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      type="button"
                      disabled={isPdfLoading}
                      className="min-h-[44px] w-full bg-sdp-primary hover:bg-sdp-primary/90"
                      onClick={() => void handleDownloadMembershipCardPdf()}
                    >
                      {isPdfLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                      {isPdfLoading ? t.verify.downloadingPdf : t.verify.downloadMembershipCardPdf}
                    </Button>
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
