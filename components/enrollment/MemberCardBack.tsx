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
      <div className="mb-2 flex min-h-[52px] w-full max-w-[260px] items-end justify-center">
        {imgOk ? (
          <img
            src={signatureSrc}
            alt=""
            width={260}
            height={90}
            className="h-auto max-h-[90px] w-auto max-w-full object-contain object-bottom"
            loading="eager"
            decoding="async"
            onError={() => setImgOk(false)}
          />
        ) : (
          <div className="h-px w-full max-w-[220px] border-b border-neutral-400" aria-hidden />
        )}
      </div>
      <p className="m-0 max-w-[220px] font-bold leading-snug text-neutral-900" style={{ fontSize: 14, lineHeight: 1.3 }}>
        {name}
      </p>
      <p className="m-0 mt-0.5 text-neutral-600" style={{ fontSize: 13, lineHeight: 1.25 }}>
        {role}
      </p>
    </div>
  );
}

interface MemberCardBackProps {
  className?: string;
  id?: string;
}

export function MemberCardBack({ className, id = "member-card-back" }: MemberCardBackProps) {
  const b = MEMBER_CARD_BACK;
  /** Terms / body copy */
  const bodySize = 16;
  const bodyLeading = 1.35;
  const bodyStyle: CSSProperties = { fontSize: bodySize, lineHeight: bodyLeading, color: "#374151" };

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card-back relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl",
        className
      )}
      style={{
        width: MEMBER_CARD_W,
        height: MEMBER_CARD_H,
        minWidth: MEMBER_CARD_W,
        minHeight: MEMBER_CARD_H,
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
        className="relative z-[1] flex h-full flex-col px-7 py-5"
        style={{ paddingBottom: 12 }}
      >
        <header className="shrink-0 border-b border-neutral-200 pb-2 text-center">
          <p
            className="m-0 font-extrabold tracking-wide text-neutral-900"
            style={{ fontSize: 17, letterSpacing: "0.04em", lineHeight: 1.2 }}
          >
            {b.headerLine1}
          </p>
          <p className="m-0 mt-1.5 font-semibold text-neutral-700" style={{ fontSize: 14, lineHeight: 1.25 }}>
            {b.headerLine2}
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-hidden pt-2">
          <p
            className="m-0 font-bold text-neutral-900 underline decoration-neutral-300 decoration-1 underline-offset-2"
            style={{ fontSize: 16, marginBottom: 8 }}
          >
            {b.sectionTitle}
          </p>
          <div className="space-y-2">
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

        <footer className="shrink-0 border-t border-neutral-200 pt-2">
          <p className="m-0 font-bold text-neutral-900" style={{ fontSize: 14, marginBottom: 6, lineHeight: 1.3 }}>
            {b.footerTitle}
          </p>
          <p
            className="m-0"
            style={{
              ...bodyStyle,
              fontSize: 12,
              marginBottom: 4,
              lineHeight: 1.35,
            }}
          >
            {b.issuedLine}
          </p>
          <p
            className="m-0"
            style={{
              ...bodyStyle,
              fontSize: 12,
              marginBottom: 8,
              lineHeight: 1.35,
            }}
          >
            {b.headquartersLine}
          </p>

          <div className="flex flex-row justify-center gap-8 px-2">
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
