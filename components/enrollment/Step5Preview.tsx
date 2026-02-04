"use client";

import React, { useCallback, useState } from "react";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { Button } from "@/components/ui/button";
import { MemberCard } from "./MemberCard";
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

interface Step5PreviewProps {
  formData: EnrollmentFormData;
  onBack: () => void;
  onBackToEnrollment?: () => void;
}

export function Step5Preview({ formData, onBack, onBackToEnrollment }: Step5PreviewProps) {
  const { t } = useLanguage();
  const [scale, setScale] = React.useState(1);
  const [confirmation, setConfirmation] = React.useState<"download" | "print" | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const membershipId = getMembershipIdFromData(formData);

  React.useEffect(() => {
    if (!confirmation) return;
    const t = setTimeout(() => setConfirmation(null), 2000);
    return () => clearTimeout(t);
  }, [confirmation]);

  React.useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const newScale = Math.min(containerWidth / 952, 1);
        setScale(newScale);
      }
    };

    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  const handleDownloadPDF = useCallback(() => {
    const card = document.getElementById("member-card-capture");
    if (!card) return;

    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(card, { 
        scale: 2, 
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 952,
        height: 426
      }).then((canvas) => {
        const imgData = canvas.toDataURL("image/png");
        const imgWidth = 280; // mm (landscape)
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        const pdf = new jsPDF({
          orientation: "landscape",
          unit: "mm",
          format: [imgWidth, imgHeight]
        });
        
        pdf.addImage(imgData, "PNG", 0, 0, imgWidth, imgHeight);
        pdf.save(`SDP-MemberCard-${formData.voterRegistrationNumber}.pdf`);
        setConfirmation("download");
      });
    }).catch((err) => {
      console.error("PDF generation failed:", err);
    });
  }, [formData]);

  const handleDownloadImage = useCallback(() => {
    const card = document.getElementById("member-card-capture");
    if (!card) return;
    import("html2canvas").then(({ default: html2canvas }) => {
      html2canvas(card, { 
        scale: 3, 
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        width: 952,
        height: 426
      }).then((canvas) => {
        const link = document.createElement("a");
        link.download = `SDP-MemberCard-${formData.voterRegistrationNumber}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        setConfirmation("download");
      });
    }).catch((err) => {
      console.error("Image download failed:", err);
      handleDownloadPDF();
    });
  }, [formData.voterRegistrationNumber, handleDownloadPDF]);

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

      <h2 className="text-base font-semibold text-neutral-900">
        {t.enrollment.step5.previewTitle}
      </h2>

      {/* Visible Preview (Scaled for screen) */}
      <div className="w-full flex justify-center py-4 overflow-hidden" ref={containerRef}>
        <div 
          style={{ 
            width: `${952 * scale}px`, 
            height: `${426 * scale}px`,
            position: "relative"
          }}
        >
          <div 
            style={{ 
              width: "952px", 
              height: "426px",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              position: "absolute",
              top: 0,
              left: 0
            }}
          >
            <MemberCard
              data={formData}
              showBarcode={true}
              className="ring-2 ring-sdp-primary/20"
            />
          </div>
        </div>
      </div>

      {/* Hidden Capture Card (Always 1:1 for perfect downloads) */}
      <div style={{ position: "absolute", left: "-9999px", top: 0 }}>
        <MemberCard
          data={formData}
          showBarcode={true}
          id="member-card-capture"
        />
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
