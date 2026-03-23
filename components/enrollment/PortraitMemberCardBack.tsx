"use client";

import type { CSSProperties } from "react";
import {
  MEMBER_CARD_BACK,
  MEMBER_CARD_BACK_STRIPE_GREEN,
  MEMBER_CARD_BACK_STRIPE_ORANGE,
  MEMBER_CARD_PORTRAIT_H,
  MEMBER_CARD_PORTRAIT_W,
  MEMBER_CARD_P_STRIPE_THICK_PX,
  MEMBER_CARD_P_STRIPE_THIN_PX,
} from "@/lib/member-card-back-content";
import { MEMBER_CARD_WATERMARK_OPACITY, MEMBER_CARD_WATERMARK_URL } from "@/lib/member-card-watermark";
import { cn } from "@/lib/utils";

const WATERMARK_URL = MEMBER_CARD_WATERMARK_URL;
const WATERMARK_OPACITY = MEMBER_CARD_WATERMARK_OPACITY;

const P_W = MEMBER_CARD_PORTRAIT_W;
const P_H = MEMBER_CARD_PORTRAIT_H;

const C = {
  greenParty: "#008000",
} as const;

const CARD_SANS =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

interface PortraitMemberCardBackProps {
  className?: string;
  id?: string;
  variant?: "screen" | "capture";
}

export function PortraitMemberCardBack({
  className,
  id = "member-card-back-portrait",
  variant = "screen",
}: PortraitMemberCardBackProps) {
  const b = MEMBER_CARD_BACK;

  const line1Style: CSSProperties = {
    fontSize: 17,
    lineHeight: 1.35,
    color: "#0a0a0a",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
  };

  const line2Style: CSSProperties = {
    fontSize: 21,
    lineHeight: 1.2,
    color: C.greenParty,
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 800,
    letterSpacing: "0.04em",
    margin: 0,
  };

  const line3Style: CSSProperties = {
    fontSize: 16,
    lineHeight: 1.45,
    color: "#111827",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
  };

  const footerLineStyle: CSSProperties = {
    fontSize: 13,
    lineHeight: 1.4,
    color: "#374151",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
  };

  const headerLineGap = 8;
  const headerTopNudge = 22;
  const headerToBodyGap = 14;
  const mainToFooterGap = 24;
  const footerLineGap = 6;

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card-back-portrait relative flex flex-col overflow-hidden rounded-lg border border-neutral-200/80 bg-white",
        variant === "capture" ? "shadow-none" : "shadow-xl",
        className
      )}
      style={{
        width: P_W,
        height: P_H,
        minWidth: P_W,
        minHeight: P_H,
        boxSizing: "border-box",
        fontFamily: CARD_SANS,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      aria-label="Digital membership card reverse portrait"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url("${WATERMARK_URL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: WATERMARK_OPACITY,
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col px-8 pt-6">
        <header
          className="shrink-0 text-center"
          style={{
            marginTop: headerTopNudge,
            marginBottom: headerToBodyGap,
          }}
        >
          <p style={line1Style}>{b.line1}</p>
          <p style={{ ...line2Style, marginTop: headerLineGap }}>{b.line2}</p>
        </header>

        <div
          className="flex min-h-0 flex-1 flex-col items-center justify-center text-center"
          style={{ gap: 6 }}
        >
          <p className="max-w-full text-pretty" style={line3Style}>
            {b.line3a}
          </p>
          <p style={line3Style}>{b.line3b}</p>
        </div>

        <footer
          className="shrink-0 px-2 pb-6 text-center"
          style={{ paddingTop: mainToFooterGap }}
        >
          <div className="flex flex-col items-center" style={{ gap: footerLineGap }}>
            {b.footerLines.map((line, i) => (
              <p key={i} className="max-w-full break-words text-pretty" style={footerLineStyle}>
                {line}
              </p>
            ))}
          </div>
        </footer>
      </div>

      <div className="relative z-[1] mt-auto flex w-full shrink-0 flex-col" data-sdp-card-stripes="">
        <div
          className="w-full shrink-0"
          style={{
            height: MEMBER_CARD_P_STRIPE_THIN_PX,
            minHeight: MEMBER_CARD_P_STRIPE_THIN_PX,
            backgroundColor: MEMBER_CARD_BACK_STRIPE_GREEN,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        />
        <div
          className="w-full shrink-0"
          style={{
            height: MEMBER_CARD_P_STRIPE_THICK_PX,
            minHeight: MEMBER_CARD_P_STRIPE_THICK_PX,
            backgroundColor: MEMBER_CARD_BACK_STRIPE_ORANGE,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        />
      </div>
    </article>
  );
}
