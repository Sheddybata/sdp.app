"use client";

import React, { useCallback, useState } from "react";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { MemberCard } from "./MemberCard";
import { MemberCardBack } from "./MemberCardBack";
import { MEMBER_CARD_H, MEMBER_CARD_W } from "@/lib/member-card-back-content";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { jsPDF } from "jspdf";
import { Download, Printer, ArrowLeft, CheckCircle2, Share2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";
import { calculateMembershipDues, DEFAULT_MONTHLY_DUE_NGN } from "@/lib/membership/dues";
import { cn } from "@/lib/utils";

interface Step5PreviewProps {
  formData: EnrollmentFormData;
  onBack: () => void;
  onBackToEnrollment?: () => void;
  portalContext?: "agent" | "cluster";
}

export function Step5Preview({
  formData,
  onBack,
  onBackToEnrollment,
  portalContext,
}: Step5PreviewProps) {
  const { t } = useLanguage();
  const [scale, setScale] = React.useState(1);
  const [confirmation, setConfirmation] = React.useState<"download" | "print" | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [cardSide, setCardSide] = React.useState<"front" | "back">("front");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const membershipId = formData.locationMembershipId || formData.membershipId || getMembershipIdFromData(formData);
  const dues = React.useMemo(() => {
    return calculateMembershipDues({
      joinDateISO: formData.joinDate || new Date().toISOString().slice(0, 10),
      monthlyDue: DEFAULT_MONTHLY_DUE_NGN,
    });
  }, [formData.joinDate]);

  React.useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 2000);
    return () => clearTimeout(t);
  }, [confirmation]);

  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newScale = Math.min(containerWidth / MEMBER_CARD_W, 1);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const html2canvasOpts = React.useMemo(
    () => ({
      scale: 2 as const,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: MEMBER_CARD_W,
      height: MEMBER_CARD_H,
    }),
    []
  );

  const handleDownloadPDF = useCallback(() => {
    const front = document.getElementById("member-card-capture");
    const back = document.getElementById("member-card-back-capture");
    if (!front || !back) return;

    import("html2canvas").then(({ default: html2canvas }) => {
      Promise.all([html2canvas(front, html2canvasOpts), html2canvas(back, html2canvasOpts)])
        .then(([cFront, cBack]) => {
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
          pdf.save(`SDP-MemberCard-${formData.voterRegistrationNumber}.pdf`);
          setConfirmation("download");
        })
        .catch((err) => console.error("PDF generation failed:", err));
    }).catch((err) => console.error("PDF generation failed:", err));
  }, [formData.voterRegistrationNumber, html2canvasOpts]);

  const handleDownloadImage = useCallback(() => {
    const front = document.getElementById("member-card-capture");
    const back = document.getElementById("member-card-back-capture");
    if (!front || !back) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      const opts = { ...html2canvasOpts, scale: 3 as const };
      Promise.all([html2canvas(front, opts), html2canvas(back, opts)])
        .then(([cFront, cBack]) => {
          const w = MEMBER_CARD_W;
          const h = MEMBER_CARD_H;
          const stacked = document.createElement("canvas");
          stacked.width = w * 3;
          stacked.height = h * 3 * 2;
          const ctx = stacked.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, stacked.width, stacked.height);
          ctx.drawImage(cFront, 0, 0, stacked.width, h * 3);
          ctx.drawImage(cBack, 0, h * 3, stacked.width, h * 3);
          const link = document.createElement("a");
          link.download = `SDP-MemberCard-${formData.voterRegistrationNumber}.png`;
          link.href = stacked.toDataURL("image/png");
          link.click();
          setConfirmation("download");
        })
        .catch((err) => {
          console.error("Image download failed:", err);
          handleDownloadPDF();
        });
    });
  }, [formData.voterRegistrationNumber, handleDownloadPDF, html2canvasOpts]);

  const handlePrint = useCallback(() => {
    window.print();
    setConfirmation("print");
  }, []);

  const handleShare = useCallback(async () => {
    const text = `I just joined the Social Democratic Party! My membership ID: ${membershipId}. Join at ${typeof window !== "undefined" ? window.location.origin : ""}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "SDP Member",
          text,
        });
      } catch {
        await navigator.clipboard?.writeText(text);
      }
    } else {
      await navigator.clipboard?.writeText(text);
    }
  }, [membershipId]);

  return (
    <div className="space-y-6">
      <p className="text-sm font-medium text-sdp-accent">
        {t.enrollment.step5.registrationComplete}
      </p>

      {portalContext && (
        <div
          className={cn(
            "rounded-lg border px-3 py-2 text-xs",
            portalContext === "agent"
              ? "border-sdp-primary/30 bg-sdp-primary/5 text-neutral-800"
              : "border-sdp-accent/30 bg-sdp-accent/5 text-neutral-800"
          )}
        >
          <strong>
            {portalContext === "agent" ? "Agent portal" : "Cluster portal"}:
          </strong>{" "}
          This member was enrolled using the same full form as the public site. When
          server support is added, the record will be linked to your signed-in{" "}
          {portalContext === "agent" ? "agent" : "cluster"} account.
        </div>
      )}

      <h2 className="text-base font-semibold text-neutral-900">
        {t.enrollment.step5.previewTitle}
      </h2>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          type="button"
          variant={cardSide === "front" ? "default" : "outline"}
          size="sm"
          className={cardSide === "front" ? "bg-sdp-accent hover:bg-[#018f4e]" : ""}
          onClick={() => setCardSide("front")}
        >
          Front of card
        </Button>
        <Button
          type="button"
          variant={cardSide === "back" ? "default" : "outline"}
          size="sm"
          className={cardSide === "back" ? "bg-sdp-accent hover:bg-[#018f4e]" : ""}
          onClick={() => setCardSide("back")}
        >
          Back of card
        </Button>
      </div>

      {/* Visible Preview (Scaled for screen) */}
      <div className="w-full flex justify-center py-4 overflow-hidden" ref={containerRef}>
        <div
          style={{
            width: `${MEMBER_CARD_W * scale}px`,
            height: `${MEMBER_CARD_H * scale}px`,
            position: "relative",
          }}
        >
          <div
            style={{
              width: MEMBER_CARD_W,
              height: MEMBER_CARD_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {cardSide === "front" ? (
              <MemberCard
                data={formData}
                showBarcode={true}
                className="ring-2 ring-sdp-primary/20"
              />
            ) : (
              <MemberCardBack className="ring-2 ring-sdp-primary/20" />
            )}
          </div>
        </div>
      </div>

      {/* Hidden captures — front + back for PNG/PDF (off-screen) */}
      <div
        id="member-cards-capture-stack"
        className="member-cards-capture-stack pointer-events-none fixed left-[-10000px] top-0 z-[-1] flex flex-col gap-0 print:static print:left-auto print:top-auto print:z-auto"
        aria-hidden
      >
        <MemberCard data={formData} showBarcode={true} id="member-card-capture" />
        <MemberCardBack id="member-card-back-capture" />
      </div>

      {confirmation && (
        <p className="text-sm font-medium text-sdp-accent" role="status" aria-live="polite">
          {confirmation === "download" ? t.enrollment.step5.downloadStarted : t.enrollment.step5.printOpened}
        </p>
      )}

      <div className="rounded-xl border border-sdp-accent/30 bg-sdp-accent/5 p-4 space-y-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-sdp-accent">
          <CheckCircle2 className="h-5 w-5" />
          {t.enrollment.step5.youAreMember}
        </p>
        <p className="text-sm text-neutral-700">{t.enrollment.step5.membershipIdLabel}: <span className="font-mono font-medium">{membershipId}</span></p>
        <p className="text-xs text-neutral-600">{t.enrollment.step5.nextSteps}</p>
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-2 shadow-sm">
        <p className="text-sm font-semibold text-neutral-900">Membership dues</p>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          <dt className="text-neutral-500">Monthly due</dt>
          <dd className="font-medium text-neutral-900">₦{dues.monthlyDue}</dd>
          <dt className="text-neutral-500">Months owed</dt>
          <dd className="font-medium text-neutral-900">{dues.monthsOwed}</dd>
          <dt className="text-neutral-500">Total owed</dt>
          <dd className="font-semibold text-neutral-900">₦{dues.amountOwed}</dd>
        </dl>
        <p className="text-xs text-neutral-600">
          You can pay later. A representative may contact you to complete payment.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            onClick={handleDownloadImage}
            className="w-full min-h-[44px] bg-sdp-accent hover:bg-[#018f4e]"
            aria-label="Download membership card as image"
          >
            <Download className="h-5 w-5" />
            {t.enrollment.step5.downloadImage}
          </Button>
          <Button
            onClick={handleDownloadPDF}
            className="w-full min-h-[44px] bg-sdp-accent hover:bg-[#018f4e]"
            aria-label="Download membership card as PDF"
          >
            <Download className="h-5 w-5" />
            {t.enrollment.step5.downloadPDF}
          </Button>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={handlePrint}
          className="w-full min-h-[44px]"
          aria-label="Print membership card"
        >
          <Printer className="h-5 w-5" />
          {t.enrollment.step5.print}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          className="w-full min-h-[44px]"
          aria-label="Back to verification step"
        >
          <ArrowLeft className="h-5 w-5" />
          {t.enrollment.step5.back}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={handleShare}
          className="w-full min-h-[44px]"
          aria-label="Share your membership"
        >
          <Share2 className="h-5 w-5" />
          {t.enrollment.step5.shareMembership}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => setShowResetConfirm(true)}
          className="w-full min-h-[44px]"
          aria-label="Start new enrollment"
        >
          {t.enrollment.step5.backToEnrollment}
        </Button>
      </div>

      <Dialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t.enrollment.step5.startNewEnrollment}</DialogTitle>
            <DialogDescription>
              {t.enrollment.step5.progressWillBeLost}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetConfirm(false)} className="min-h-[44px]">
              {t.common.cancel}
            </Button>
            <Button
              variant="default"
              onClick={() => {
                setShowResetConfirm(false);
                onBackToEnrollment?.();
              }}
              className="min-h-[44px] bg-red-600 hover:bg-red-700"
            >
              {t.enrollment.step5.yesStartOver}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
