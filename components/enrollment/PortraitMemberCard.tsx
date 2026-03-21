"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";
import {
  MEMBER_CARD_PORTRAIT_H,
  MEMBER_CARD_PORTRAIT_W,
} from "@/lib/member-card-back-content";
import {
  MEMBER_CARD_WATERMARK_OPACITY as CARD_WATERMARK_OPACITY,
  MEMBER_CARD_WATERMARK_URL as CARD_WATERMARK_URL,
} from "@/lib/member-card-watermark";

const P_W = MEMBER_CARD_PORTRAIT_W;
const P_H = MEMBER_CARD_PORTRAIT_H;
const PX = 28;

const CARD_SANS =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

const C = {
  label: "#808080",
  greenParty: "#008000",
  redBanner: "#FF0000",
  redId: "#CC0000",
  noLabel: "#FF8C00",
} as const;

function getStateName(stateId: string): string {
  return NIGERIA_STATES.find((s) => s.id === stateId)?.name ?? stateId;
}

function formatSlugForDisplay(s: string): string {
  if (!s) return "—";
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatDisplayName(data: EnrollmentFormData): string {
  const raw = [data.surname, data.firstName, data.otherNames].filter(Boolean).join(" ").trim();
  if (!raw) return "—";
  return raw
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function formatNameWithTitle(data: EnrollmentFormData): string {
  const name = formatDisplayName(data);
  const t = data.title?.trim();
  if (!t) return name;
  return `${t} ${name}`;
}

function getMemberSinceLabel(joinDate?: string): string {
  if (!joinDate) return "—";
  try {
    const d = new Date(joinDate);
    if (Number.isNaN(d.getTime())) return "—";
    return format(d, "MMM yyyy");
  } catch {
    return "—";
  }
}

/** Portrait — name + membership No line */
const BODY: CSSProperties = {
  fontSize: 29,
  lineHeight: 1.25,
  marginBottom: 4,
  fontFamily: CARD_SANS,
};

/** Smaller type for State / LG / Ward / Polling / Tel / Member since only */
const BODY_DETAIL: CSSProperties = {
  fontSize: 21,
  lineHeight: 1.22,
  marginBottom: 4,
  fontFamily: CARD_SANS,
};

/** Party header lines: +50% vs previous 16px */
const PARTY_LINE_PX = 24;

const QR_DISPLAY_PX = 128;

interface PortraitMemberCardProps {
  data: EnrollmentFormData;
  className?: string;
  showBarcode?: boolean;
  id?: string;
  variant?: "screen" | "capture";
}

export function PortraitMemberCard({
  data,
  className,
  showBarcode = true,
  id = "member-card-portrait",
  variant = "screen",
}: PortraitMemberCardProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const membershipId = data.locationMembershipId || data.membershipId || getMembershipIdFromData(data);

  useEffect(() => {
    if (!showBarcode) return;
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const regId = encodeURIComponent(membershipId.replace(/\s/g, ""));
    if (!regId) return;
    const payload = `${base}/enroll/verify?member=${regId}`;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(payload, {
        width: QR_DISPLAY_PX,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [showBarcode, membershipId]);

  const displayNameWithTitle = formatNameWithTitle(data);
  const memberSince = getMemberSinceLabel(data.joinDate);

  const bannerText: CSSProperties = {
    margin: 0,
    textAlign: "center",
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 1.2,
    fontWeight: 600,
    fontFamily: CARD_SANS,
  };

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card-portrait relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white",
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
      aria-label="Digital membership card portrait"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url("${CARD_WATERMARK_URL}")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: CARD_WATERMARK_OPACITY,
        }}
        aria-hidden
      />

      {/* Header: logo | party stack | decorative corner */}
      <header
        className="relative z-[1] flex shrink-0 items-start justify-between"
        style={{ paddingLeft: PX, paddingRight: PX, paddingTop: 30, paddingBottom: 6 }}
      >
        <div
          className="relative flex shrink-0 items-start justify-center overflow-visible"
          style={{ width: 96, height: 96 }}
          aria-hidden
        >
          <img
            src="/sdplogo.jpg"
            alt="SDP logo"
            className="h-full w-full object-contain"
            style={{
              transform: "scale(1.3)",
              transformOrigin: "center center",
            }}
          />
        </div>
        <div className="min-w-0 flex-1 px-2 pt-1 text-center">
          <p
            className="m-0 leading-tight"
            style={{
              color: C.greenParty,
              fontWeight: 800,
              fontSize: PARTY_LINE_PX,
              fontFamily: CARD_SANS,
              letterSpacing: "-0.01em",
              textShadow: "0.35px 0 0 currentColor, -0.35px 0 0 currentColor",
            }}
          >
            Social Democratic Party
          </p>
          <p
            className="m-0 mt-1 leading-tight"
            style={{
              color: C.greenParty,
              fontWeight: 800,
              fontSize: PARTY_LINE_PX,
              fontFamily: CARD_SANS,
              letterSpacing: "-0.01em",
            }}
          >
            SDP
          </p>
        </div>
        <div className="relative h-16 w-14 shrink-0 overflow-hidden" aria-hidden>
          <div
            className="absolute right-0 top-0"
            style={{
              width: 0,
              height: 0,
              borderStyle: "solid",
              borderWidth: "0 52px 72px 0",
              borderColor: "transparent rgba(34, 197, 94, 0.45) transparent transparent",
            }}
          />
        </div>
      </header>

      {/* Full-width red title bar */}
      <div
        className="relative z-[1] mt-2 shrink-0 text-white"
        data-sdp-red-banner
        style={{
          width: P_W,
          boxSizing: "border-box",
          backgroundColor: C.redBanner,
          paddingTop: 14,
          paddingBottom: 14,
          paddingLeft: 12,
          paddingRight: 12,
        }}
      >
        <p style={bannerText}>
          <span style={{ fontWeight: 400, fontStyle: "italic" }}>Digital </span>
          <span
            style={{
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              fontStyle: "normal",
            }}
          >
            MEMBERSHIP CARD
          </span>
        </p>
      </div>

      {/* Photo — smaller so member block + QR sit higher */}
      <div className="relative z-[1] flex shrink-0 justify-center pt-2 pb-2">
        <div
          className="overflow-hidden rounded-md bg-neutral-100 ring-1 ring-neutral-200"
          style={{ width: 220, height: 292 }}
        >
          {data.portraitDataUrl ? (
            <img src={data.portraitDataUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">Photo</div>
          )}
        </div>
      </div>

      {/* Member details — text block centered; QR centered at bottom (aligned with photo column) */}
      <div
        data-sdp-member-body=""
        className="relative z-[1] flex min-h-0 flex-1 flex-col px-7"
        style={{ paddingBottom: 6 }}
      >
        <div className="flex w-full flex-col items-center text-center">
          <p
            className="m-0 font-bold text-neutral-900"
            style={{
              ...BODY,
              fontSize: 33,
              marginBottom: 10,
              lineHeight: 1.15,
            }}
          >
            {displayNameWithTitle}
          </p>
          <p className="m-0" style={{ ...BODY, marginBottom: 10 }}>
            <span style={{ fontWeight: 600, color: C.noLabel }}>No: </span>
            <span style={{ fontWeight: 800, color: C.redId, letterSpacing: "-0.02em" }}>{membershipId || "—"}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 4 }}>
            <span style={{ color: C.label }}>State: </span>
            <span className="font-bold text-neutral-900">{getStateName(data.state) || "—"}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 4 }}>
            <span style={{ color: C.label }}>LG: </span>
            <span className="font-bold text-neutral-900">{formatSlugForDisplay(data.lga)}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 4 }}>
            <span style={{ color: C.label }}>Ward: </span>
            <span className="font-bold text-neutral-900">{formatSlugForDisplay(data.ward)}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 8 }}>
            <span style={{ color: C.label }}>Polling Unit: </span>
            <span className="font-bold text-neutral-900">{data.pollingUnit?.trim() || "—"}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 4 }}>
            <span style={{ color: C.label }}>Tel: </span>
            <span className="font-bold text-neutral-900">{data.phone || "—"}</span>
          </p>
          <p className="m-0" style={{ ...BODY_DETAIL, marginBottom: 0 }}>
            <span style={{ color: C.label }}>Member since: </span>
            <span className="font-bold text-neutral-900">{memberSince}</span>
          </p>
        </div>

        <div className="mt-auto flex w-full shrink-0 justify-center pt-2 pb-1">
          {showBarcode && membershipId ? (
            <div className="rounded-sm border border-neutral-300 bg-white p-0.5" aria-hidden>
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt=""
                  width={QR_DISPLAY_PX}
                  height={QR_DISPLAY_PX}
                  className="block"
                  style={{ width: QR_DISPLAY_PX, height: QR_DISPLAY_PX }}
                />
              ) : (
                <div
                  className="flex items-center justify-center text-xs text-neutral-400"
                  style={{ width: QR_DISPLAY_PX, height: QR_DISPLAY_PX }}
                >
                  QR…
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Tricolour footer — green, white, red */}
      <div className="relative z-[1] mt-auto flex w-full shrink-0 flex-col">
        <div className="h-2.5 w-full" style={{ backgroundColor: C.greenParty }} />
        <div className="h-1.5 w-full bg-white" />
        <div className="h-2.5 w-full" style={{ backgroundColor: C.redBanner }} />
      </div>
    </article>
  );
}
