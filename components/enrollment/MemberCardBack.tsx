"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import {
  MEMBER_CARD_BACK,
  MEMBER_CARD_H,
  MEMBER_CARD_W,
} from "@/lib/member-card-back-content";
import { cn } from "@/lib/utils";

const WATERMARK_SRC = "/membershipregistration/backgroundid.jpeg";
const WATERMARK_OPACITY = 0.17;

/** Scale back-of-card typography/padding from original 952×560 design to ID-1 landscape size */
const REF_L_W = 952;
const REF_L_H = 560;
const LSX = MEMBER_CARD_W / REF_L_W;
const LSY = MEMBER_CARD_H / REF_L_H;
const BACK_PAD_X = Math.round(28 * LSX);
const BACK_PAD_Y = Math.round(20 * LSY);
const BACK_PAD_BOTTOM = Math.max(8, Math.round(12 * LSY));

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
      <span className="font-bold text-neutral-900">{heading}</span> {children}
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
      {/* Paths assigned per role in lib/member-card-back-content.ts */}
      <div
        className="mb-2 flex w-full items-end justify-center"
        style={{ minHeight: Math.round(52 * LSY), maxWidth: Math.round(260 * LSX) }}
      >
        {imgOk ? (
          <img
            src={signatureSrc}
            alt=""
            width={Math.round(260 * LSX)}
            height={Math.round(90 * LSY)}
            className="h-auto w-auto max-w-full object-contain object-bottom"
            style={{ maxHeight: Math.round(90 * LSY) }}
            loading="eager"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="h-px w-full max-w-[220px] border-b border-neutral-400" aria-hidden />
        )}
      </div>
      <p
        className="m-0 font-bold leading-snug text-neutral-900"
        style={{
          maxWidth: Math.round(220 * LSX),
          fontSize: Math.max(11, Math.round(14 * LSY)),
          lineHeight: 1.3,
        }}
      >
        {name}
      </p>
      <p
        className="m-0 mt-0.5 text-neutral-600"
        style={{ fontSize: Math.max(10, Math.round(13 * LSY)), lineHeight: 1.25 }}
      >
        {role}
      </p>
    </div>
  );
}

interface MemberCardBackProps {
  className?: string;
  id?: string;
  variant?: "screen" | "capture";
}

export function MemberCardBack({ className, id = "member-card-back", variant = "screen" }: MemberCardBackProps) {
  const b = MEMBER_CARD_BACK;
  /** Terms / body copy */
  const bodySize = Math.max(13, Math.round(16 * LSY));
  const bodyLeading = 1.35;
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
        "sdp-member-card-back relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white",
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
        className="relative z-[1] flex h-full flex-col"
        style={{
          paddingLeft: BACK_PAD_X,
          paddingRight: BACK_PAD_X,
          paddingTop: BACK_PAD_Y,
          paddingBottom: BACK_PAD_BOTTOM,
        }}
      >
        <header
          className="shrink-0 border-b border-neutral-200 text-center"
          style={{ paddingBottom: Math.max(6, Math.round(8 * LSY)) }}
        >
          <p
            className="m-0 font-extrabold tracking-wide text-neutral-900"
            style={{
              fontSize: Math.max(14, Math.round(17 * LSY)),
              letterSpacing: "0.04em",
              lineHeight: 1.2,
            }}
          >
            {b.headerLine1}
          </p>
          <p
            className="m-0 mt-1.5 font-semibold text-neutral-700"
            style={{ fontSize: Math.max(12, Math.round(14 * LSY)), lineHeight: 1.25 }}
          >
            {b.headerLine2}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden" style={{ paddingTop: Math.max(6, Math.round(8 * LSY)) }}>
          <p
            className="m-0 font-bold text-neutral-900 underline decoration-neutral-300 decoration-1 underline-offset-2"
            style={{ fontSize: Math.max(13, Math.round(16 * LSY)), marginBottom: Math.max(5, Math.round(8 * LSY)) }}
          >
            {b.sectionTitle}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: Math.max(6, Math.round(8 * LSY)) }}>
            <TermBlock heading={b.ownershipHeading} style={bodyStyle}>
              {b.ownershipBody}
            </TermBlock>
            <TermBlock heading={b.conductHeading} style={bodyStyle}>
              {b.conductBody}
            </TermBlock>
            <TermBlock heading={b.validationHeading} style={bodyStyle}>
              <>
                {b.validationBodyPrefix}
                <span className="break-all font-medium text-[#008000]">{b.verificationUrl}</span>
              </>
            </TermBlock>
            <TermBlock heading={b.privacyHeading} style={bodyStyle}>
              {b.privacyBody}
            </TermBlock>
          </div>
        </div>

        <footer className="shrink-0 border-t border-neutral-200" style={{ paddingTop: Math.max(6, Math.round(8 * LSY)) }}>
          <p
            className="m-0 font-bold text-neutral-900"
            style={{
              fontSize: Math.max(12, Math.round(14 * LSY)),
              marginBottom: Math.max(4, Math.round(6 * LSY)),
              lineHeight: 1.3,
            }}
          >
            {b.footerTitle}
          </p>
          <p
            className="m-0"
            style={{
              ...bodyStyle,
              fontSize: Math.max(10, Math.round(12 * LSY)),
              marginBottom: Math.max(3, Math.round(4 * LSY)),
              lineHeight: 1.35,
            }}
          >
            {b.issuedLine}
          </p>
          <p
            className="m-0"
            style={{
              ...bodyStyle,
              fontSize: Math.max(10, Math.round(12 * LSY)),
              marginBottom: Math.max(6, Math.round(8 * LSY)),
              lineHeight: 1.35,
            }}
          >
            {b.headquartersLine}
          </p>

          <div className="flex flex-row justify-center px-2" style={{ gap: Math.max(16, Math.round(32 * LSX)) }}>
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
