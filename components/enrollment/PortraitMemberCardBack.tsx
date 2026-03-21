"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  MEMBER_CARD_BACK,
  MEMBER_CARD_PORTRAIT_H,
  MEMBER_CARD_PORTRAIT_W,
} from "@/lib/member-card-back-content";
import { cn } from "@/lib/utils";

const WATERMARK_SRC = "/membershipregistration/backgroundid.jpeg";
const WATERMARK_OPACITY = 0.17;
const P_W = MEMBER_CARD_PORTRAIT_W;
const P_H = MEMBER_CARD_PORTRAIT_H;

const CARD_SANS =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

function TermBlock({
  heading,
  children,
  style,
}: {
  heading: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <p className="m-0" style={style}>
      <span style={{ fontWeight: 700, color: "#171717" }}>{heading}</span> {children}
    </p>
  );
}

function Signatory({
  signatureSrc,
  name,
  role,
}: {
  signatureSrc: string;
  name: string;
  role: string;
}) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center text-center">
      <div className="mb-1 flex min-h-[48px] w-full max-w-[220px] items-end justify-center">
        {imgOk ? (
          <img
            src={signatureSrc}
            alt=""
            width={220}
            height={78}
            className="h-auto max-h-[78px] w-auto max-w-full object-contain object-bottom"
            loading="eager"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="h-px w-full max-w-[180px] border-b border-neutral-400" aria-hidden />
        )}
      </div>
      <p className="m-0 max-w-[220px] font-bold leading-snug text-neutral-900" style={{ fontSize: 13.5, lineHeight: 1.25 }}>
        {name}
      </p>
      <p className="m-0 mt-0.5 text-neutral-600" style={{ fontSize: 12.5, lineHeight: 1.2 }}>
        {role}
      </p>
    </div>
  );
}

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
  const bodySize = 14.5;
  const bodyLeading = 1.38;
  const bodyStyle: CSSProperties = {
    fontSize: bodySize,
    lineHeight: bodyLeading,
    color: "#374151",
    fontFamily: CARD_SANS,
  };

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card-back-portrait relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white",
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
          backgroundImage: `url(${WATERMARK_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: WATERMARK_OPACITY,
        }}
        aria-hidden
      />

      <div className="relative z-[1] flex h-full flex-col px-6 py-5" style={{ paddingBottom: 12 }}>
        <header className="shrink-0 border-b border-neutral-200 pb-3 text-center">
          <p
            className="m-0 font-extrabold tracking-wide text-neutral-900"
            style={{ fontSize: 16, letterSpacing: "0.03em", lineHeight: 1.22 }}
          >
            {b.headerLine1}
          </p>
          <p className="m-0 mt-1.5 font-semibold text-neutral-700" style={{ fontSize: 14, lineHeight: 1.28 }}>
            {b.headerLine2}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden pt-3">
          <p
            className="m-0 font-bold text-neutral-900 underline decoration-neutral-300 decoration-1 underline-offset-2"
            style={{ fontSize: 15.5, marginBottom: 8 }}
          >
            {b.sectionTitle}
          </p>
          <div className="space-y-2.5">
            <TermBlock heading={b.ownershipHeading} style={bodyStyle}>
              {b.ownershipBody}
            </TermBlock>
            <TermBlock heading={b.conductHeading} style={bodyStyle}>
              {b.conductBody}
            </TermBlock>
            <TermBlock heading={b.validationHeading} style={bodyStyle}>
              <>
                {b.validationBodyPrefix}
                <span className="break-all font-medium" style={{ color: "#008000" }}>
                  {b.verificationUrl}
                </span>
              </>
            </TermBlock>
            <TermBlock heading={b.privacyHeading} style={bodyStyle}>
              {b.privacyBody}
            </TermBlock>
          </div>
        </div>

        <footer className="shrink-0 border-t border-neutral-200 pt-3">
          <p className="m-0 font-bold text-neutral-900" style={{ fontSize: 14.5, marginBottom: 6, lineHeight: 1.3 }}>
            {b.footerTitle}
          </p>
          <p className="m-0" style={{ ...bodyStyle, fontSize: 12.5, marginBottom: 4, lineHeight: 1.38 }}>
            {b.issuedLine}
          </p>
          <p className="m-0" style={{ ...bodyStyle, fontSize: 12.5, marginBottom: 8, lineHeight: 1.38 }}>
            {b.headquartersLine}
          </p>
          <div className="flex flex-row justify-center gap-5 px-1">
            <Signatory
              signatureSrc={b.chairman.signatureSrc}
              name={b.chairman.name}
              role={b.chairman.title}
            />
            <Signatory
              signatureSrc={b.secretary.signatureSrc}
              name={b.secretary.name}
              role={b.secretary.title}
            />
          </div>
        </footer>
      </div>
    </article>
  );
}
