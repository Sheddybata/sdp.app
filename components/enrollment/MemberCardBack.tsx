"use client";

import type { CSSProperties } from "react";
import {
  MEMBER_CARD_BACK,
  MEMBER_CARD_BACK_STRIPE_GREEN,
  MEMBER_CARD_BACK_STRIPE_ORANGE,
  MEMBER_CARD_H,
  MEMBER_CARD_W,
} from "@/lib/member-card-back-content";
import { cn } from "@/lib/utils";

const WATERMARK_SRC = "/membershipregistration/backgroundid.jpeg";
const WATERMARK_OPACITY = 0.17;

const C = {
  greenParty: "#008000",
} as const;

/** Scale back-of-card typography/padding from original 952×560 design to ID-1 landscape size */
const REF_L_W = 952;
const REF_L_H = 560;
const LSX = MEMBER_CARD_W / REF_L_W;
const LSY = MEMBER_CARD_H / REF_L_H;
const BACK_PAD_X = Math.round(28 * LSX);
const BACK_PAD_Y = Math.round(18 * LSY);

const CARD_SANS =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

interface MemberCardBackProps {
  className?: string;
  id?: string;
  variant?: "screen" | "capture";
}

export function MemberCardBack({ className, id = "member-card-back", variant = "screen" }: MemberCardBackProps) {
  const b = MEMBER_CARD_BACK;

  const line1Size = Math.max(17, Math.round(20 * LSY));
  const line2Size = Math.max(22, Math.round(27 * LSY));
  const line3Size = Math.max(16, Math.round(19 * LSY));
  const footerLineSize = Math.max(12, Math.round(14 * LSY));
  const footerLineGap = Math.max(4, Math.round(6 * LSY));

  const line1Style: CSSProperties = {
    fontSize: line1Size,
    lineHeight: 1.35,
    color: "#0a0a0a",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
  };

  const line2Style: CSSProperties = {
    fontSize: line2Size,
    lineHeight: 1.2,
    color: C.greenParty,
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 800,
    letterSpacing: "0.04em",
    margin: 0,
  };

  const line3Style: CSSProperties = {
    fontSize: line3Size,
    lineHeight: 1.45,
    color: "#111827",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
    maxWidth: "100%",
  };

  const footerLineStyle: CSSProperties = {
    fontSize: footerLineSize,
    lineHeight: 1.4,
    color: "#374151",
    fontFamily: CARD_SANS,
    textAlign: "center",
    fontWeight: 500,
    margin: 0,
  };

  const headerLineGap = Math.max(6, Math.round(8 * LSY));
  const headerTopNudge = Math.max(22, Math.round(26 * LSY));
  const headerToBodyGap = Math.max(10, Math.round(14 * LSY));
  const mainToFooterGap = Math.max(16, Math.round(22 * LSY));

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card-back relative flex flex-col overflow-hidden rounded-lg border border-neutral-200/80 bg-white",
        variant === "capture" ? "shadow-none" : "shadow-xl",
        className
      )}
      style={{
        width: MEMBER_CARD_W,
        height: MEMBER_CARD_H,
        minWidth: MEMBER_CARD_W,
        minHeight: MEMBER_CARD_H,
        boxSizing: "border-box",
        fontFamily: CARD_SANS,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      aria-label="Digital membership card reverse"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${WATERMARK_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: WATERMARK_OPACITY,
        }}
        aria-hidden
      />

      <div
        className="relative z-[1] flex min-h-0 flex-1 flex-col"
        style={{
          paddingLeft: BACK_PAD_X,
          paddingRight: BACK_PAD_X,
          paddingTop: BACK_PAD_Y,
        }}
      >
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
          style={{ gap: Math.max(2, Math.round(4 * LSY)) }}
        >
          <p className="text-pretty" style={line3Style}>
            {b.line3a}
          </p>
          <p style={line3Style}>{b.line3b}</p>
        </div>

        <footer
          className="shrink-0 text-center"
          style={{
            paddingLeft: BACK_PAD_X,
            paddingRight: BACK_PAD_X,
            paddingTop: mainToFooterGap,
            paddingBottom: Math.max(10, Math.round(12 * LSY)),
          }}
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

      {/* Green (thin) + orange (thick) — SDP back-of-card stripes */}
      <div className="relative z-[1] mt-auto flex w-full shrink-0 flex-col">
        <div className="h-1 w-full" style={{ backgroundColor: MEMBER_CARD_BACK_STRIPE_GREEN }} />
        <div className="h-2.5 w-full" style={{ backgroundColor: MEMBER_CARD_BACK_STRIPE_ORANGE }} />
      </div>
    </article>
  );
}
