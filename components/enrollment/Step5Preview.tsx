"use client";

import React, { useCallback, useState } from "react";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { MemberCard } from "./MemberCard";
import { MemberCardBack } from "./MemberCardBack";
import { PortraitMemberCard } from "./PortraitMemberCard";
import { PortraitMemberCardBack } from "./PortraitMemberCardBack";
import {
  MEMBER_CARD_H,
  MEMBER_CARD_W,
  MEMBER_CARD_PORTRAIT_H,
  MEMBER_CARD_PORTRAIT_W,
} from "@/lib/member-card-back-content";
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
import {
  mergeCanvasesVertical,
  patchClonedMemberCardsForExport,
  waitForCaptureReady,
} from "@/lib/member-card-capture";
import { format, startOfMonth } from "date-fns";

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
  const [cardLayout, setCardLayout] = React.useState<"landscape" | "portrait">("landscape");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const membershipId = formData.locationMembershipId || formData.membershipId || getMembershipIdFromData(formData);
  const dues = React.useMemo(() => {
    return calculateMembershipDues({
      joinDateISO: formData.joinDate || format(startOfMonth(new Date()), "yyyy-MM-dd"),
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
        const cardW =
          cardLayout === "landscape" ? MEMBER_CARD_W : MEMBER_CARD_PORTRAIT_W;
        const newScale = Math.min(containerWidth / cardW, 1);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, [cardLayout]);

  /** Same ring as on-screen preview so export matches what the user sees */
  const previewRingClass = "ring-2 ring-sdp-primary/20";

  const html2canvasOpts = React.useMemo(
    () => ({
      scale: 2 as const,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      foreignObjectRendering: false,
      /**
       * Capture host uses near-zero opacity so it’s invisible on the page; the clone used for
       * rasterization must be fully opaque or some browsers flatten layout/text incorrectly.
       */
      onclone: (clonedDoc: Document) => {
        clonedDoc.querySelectorAll<HTMLElement>(".member-cards-capture-host").forEach((host) => {
          host.style.opacity = "1";
        });
        patchClonedMemberCardsForExport(clonedDoc);
      },
    }),
    []
  );

  const handleDownloadPDF = useCallback(() => {
    const portrait = cardLayout === "portrait";
    const front = document.getElementById(
      portrait ? "member-card-capture-portrait" : "member-card-capture"
    );
    const back = document.getElementById(
      portrait ? "member-card-back-capture-portrait" : "member-card-back-capture"
    );
    if (!front || !back) return;

    import("html2canvas").then(async ({ default: html2canvas }) => {
      await waitForCaptureReady();
      Promise.all([
        html2canvas(front as HTMLElement, html2canvasOpts),
        html2canvas(back as HTMLElement, html2canvasOpts),
      ])
        .then(([cFront, cBack]) => {
          if (portrait) {
            const imgWidthMm = 70;
            const imgHeightMm = (cFront.height * imgWidthMm) / cFront.width;
            const pdf = new jsPDF({
              orientation: "portrait",
              unit: "mm",
              format: [imgWidthMm, imgHeightMm],
            });
            pdf.addImage(cFront.toDataURL("image/png"), "PNG", 0, 0, imgWidthMm, imgHeightMm);
            pdf.addPage([imgWidthMm, imgHeightMm], "p");
            pdf.addImage(cBack.toDataURL("image/png"), "PNG", 0, 0, imgWidthMm, imgHeightMm);
            pdf.save(`SDP-MemberCard-portrait-${formData.voterRegistrationNumber}.pdf`);
          } else {
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
          }
          setConfirmation("download");
        })
        .catch((err) => console.error("PDF generation failed:", err));
    }).catch((err) => console.error("PDF generation failed:", err));
  }, [cardLayout, formData.voterRegistrationNumber, html2canvasOpts]);

  const handleDownloadImage = useCallback(() => {
    const portrait = cardLayout === "portrait";
    const front = document.getElementById(
      portrait ? "member-card-capture-portrait" : "member-card-capture"
    );
    const back = document.getElementById(
      portrait ? "member-card-back-capture-portrait" : "member-card-back-capture"
    );
    if (!front || !back) return;
    import("html2canvas").then(async ({ default: html2canvas }) => {
      await waitForCaptureReady();
      const opts = { ...html2canvasOpts, scale: 3 as const };
      Promise.all([
        html2canvas(front as HTMLElement, opts),
        html2canvas(back as HTMLElement, opts),
      ])
        .then(([cFront, cBack]) => {
          const gap = 12;
          const stacked = mergeCanvasesVertical(cFront, cBack, gap);
          const link = document.createElement("a");
          link.download = portrait
            ? `SDP-MemberCard-portrait-${formData.voterRegistrationNumber}.png`
            : `SDP-MemberCard-${formData.voterRegistrationNumber}.png`;
          link.href = stacked.toDataURL("image/png");
          link.click();
          setConfirmation("download");
        })
        .catch((err) => {
          console.error("Image download failed:", err);
          handleDownloadPDF();
        });
    });
  }, [cardLayout, formData.voterRegistrationNumber, handleDownloadPDF, html2canvasOpts]);

  const handleDownloadBothPDF = useCallback(() => {
    const lf = document.getElementById("member-card-capture");
    const lb = document.getElementById("member-card-back-capture");
    const pf = document.getElementById("member-card-capture-portrait");
    const pb = document.getElementById("member-card-back-capture-portrait");
    if (!lf || !lb || !pf || !pb) return;

    import("html2canvas").then(async ({ default: html2canvas }) => {
      await waitForCaptureReady();
      Promise.all([
        html2canvas(lf as HTMLElement, html2canvasOpts),
        html2canvas(lb as HTMLElement, html2canvasOpts),
        html2canvas(pf as HTMLElement, html2canvasOpts),
        html2canvas(pb as HTMLElement, html2canvasOpts),
      ])
        .then(([cLf, cLb, cPf, cPb]) => {
          const lw = 280;
          const lh = (cLf.height * lw) / cLf.width;
          const pw = 70;
          const ph = (cPf.height * pw) / cPf.width;

          const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: [lw, lh],
          });
          pdf.addImage(cLf.toDataURL("image/png"), "PNG", 0, 0, lw, lh);
          pdf.addPage([lw, lh], "l");
          pdf.addImage(cLb.toDataURL("image/png"), "PNG", 0, 0, lw, lh);
          pdf.addPage([pw, ph], "p");
          pdf.addImage(cPf.toDataURL("image/png"), "PNG", 0, 0, pw, ph);
          pdf.addPage([pw, ph], "p");
          pdf.addImage(cPb.toDataURL("image/png"), "PNG", 0, 0, pw, ph);
          pdf.save(`SDP-MemberCard-both-layouts-${formData.voterRegistrationNumber}.pdf`);
          setConfirmation("download");
        })
        .catch((err) => console.error("PDF generation failed:", err));
    });
  }, [formData.voterRegistrationNumber, html2canvasOpts]);

  const handleDownloadBothPNG = useCallback(() => {
    const lf = document.getElementById("member-card-capture");
    const lb = document.getElementById("member-card-back-capture");
    const pf = document.getElementById("member-card-capture-portrait");
    const pb = document.getElementById("member-card-back-capture-portrait");
    if (!lf || !lb || !pf || !pb) return;

    import("html2canvas").then(async ({ default: html2canvas }) => {
      await waitForCaptureReady();
      const opts = { ...html2canvasOpts, scale: 3 as const };
      Promise.all([
        html2canvas(lf as HTMLElement, opts),
        html2canvas(lb as HTMLElement, opts),
        html2canvas(pf as HTMLElement, opts),
        html2canvas(pb as HTMLElement, opts),
      ])
        .then(([cLf, cLb, cPf, cPb]) => {
          const sectionGap = 36;
          const landStack = mergeCanvasesVertical(cLf, cLb, 12);
          const portStack = mergeCanvasesVertical(cPf, cPb, 12);
          const maxW = Math.max(landStack.width, portStack.width);
          const totalH = landStack.height + sectionGap + portStack.height;
          const stacked = document.createElement("canvas");
          stacked.width = maxW;
          stacked.height = totalH;
          const ctx = stacked.getContext("2d");
          if (!ctx) return;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, maxW, totalH);
          ctx.drawImage(landStack, Math.floor((maxW - landStack.width) / 2), 0);
          ctx.drawImage(
            portStack,
            Math.floor((maxW - portStack.width) / 2),
            landStack.height + sectionGap
          );
          const link = document.createElement("a");
          link.download = `SDP-MemberCard-both-layouts-${formData.voterRegistrationNumber}.png`;
          link.href = stacked.toDataURL("image/png");
          link.click();
          setConfirmation("download");
        })
        .catch((err) => console.error("Image download failed:", err));
    });
  }, [formData.voterRegistrationNumber, html2canvasOpts]);

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
          variant={cardLayout === "landscape" ? "default" : "outline"}
          size="sm"
          className={cardLayout === "landscape" ? "bg-sdp-primary hover:bg-sdp-primary/90" : ""}
          onClick={() => setCardLayout("landscape")}
        >
          {t.enrollment.step5.layoutLandscape}
        </Button>
        <Button
          type="button"
          variant={cardLayout === "portrait" ? "default" : "outline"}
          size="sm"
          className={cardLayout === "portrait" ? "bg-sdp-primary hover:bg-sdp-primary/90" : ""}
          onClick={() => setCardLayout("portrait")}
        >
          {t.enrollment.step5.layoutPortrait}
        </Button>
      </div>

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
            width: `${(cardLayout === "landscape" ? MEMBER_CARD_W : MEMBER_CARD_PORTRAIT_W) * scale}px`,
            height: `${(cardLayout === "landscape" ? MEMBER_CARD_H : MEMBER_CARD_PORTRAIT_H) * scale}px`,
            position: "relative",
          }}
        >
          <div
            style={{
              width: cardLayout === "landscape" ? MEMBER_CARD_W : MEMBER_CARD_PORTRAIT_W,
              height: cardLayout === "landscape" ? MEMBER_CARD_H : MEMBER_CARD_PORTRAIT_H,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0,
            }}
          >
            {cardLayout === "landscape" ? (
              cardSide === "front" ? (
                <MemberCard data={formData} showBarcode={true} className={previewRingClass} />
              ) : (
                <MemberCardBack className={previewRingClass} />
              )
            ) : cardSide === "front" ? (
              <PortraitMemberCard data={formData} showBarcode={true} className={previewRingClass} />
            ) : (
              <PortraitMemberCardBack className={previewRingClass} />
            )}
          </div>
        </div>
      </div>

      {/*
        Export targets: same card dimensions + ring + screen variant as the preview (not variant="capture").
        Framed like the preview inner box (fixed W×H) so flex parents can’t alter layout.
        Host opacity is reset to 1 inside html2canvas onclone before rasterizing.
      */}
      <div
        className="member-cards-capture-host pointer-events-none fixed left-0 z-0 flex flex-row items-start gap-4 print:static print:z-auto print:w-full print:flex-col print:items-center"
        style={{
          top: "100vh",
          opacity: 0.004,
          width: MEMBER_CARD_W + MEMBER_CARD_PORTRAIT_W + 32,
        }}
        aria-hidden
      >
        <div
          id="member-cards-capture-stack"
          className="member-cards-capture-stack flex shrink-0 flex-col gap-0"
          style={{ width: MEMBER_CARD_W }}
        >
          <div
            className="flex-none"
            style={{
              width: MEMBER_CARD_W,
              height: MEMBER_CARD_H,
              position: "relative",
            }}
          >
            <MemberCard
              data={formData}
              showBarcode={true}
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
        <div
          id="member-cards-capture-stack-portrait"
          className="member-cards-capture-stack-portrait flex shrink-0 flex-col gap-0"
          style={{ width: MEMBER_CARD_PORTRAIT_W }}
        >
          <div
            className="flex-none"
            style={{
              width: MEMBER_CARD_PORTRAIT_W,
              height: MEMBER_CARD_PORTRAIT_H,
              position: "relative",
            }}
          >
            <PortraitMemberCard
              data={formData}
              showBarcode={true}
              id="member-card-capture-portrait"
              className={previewRingClass}
            />
          </div>
          <div
            className="flex-none"
            style={{
              width: MEMBER_CARD_PORTRAIT_W,
              height: MEMBER_CARD_PORTRAIT_H,
              position: "relative",
            }}
          >
            <PortraitMemberCardBack id="member-card-back-capture-portrait" className={previewRingClass} />
          </div>
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadBothPNG}
            className="w-full min-h-[44px] border-sdp-primary/40"
            aria-label="Download landscape and portrait cards as one PNG"
          >
            <Download className="h-5 w-5" />
            {t.enrollment.step5.downloadBothPNG}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadBothPDF}
            className="w-full min-h-[44px] border-sdp-primary/40"
            aria-label="Download landscape and portrait cards as one PDF"
          >
            <Download className="h-5 w-5" />
            {t.enrollment.step5.downloadBothPDF}
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
