"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";
import { MEMBER_CARD_H as CARD_H, MEMBER_CARD_W as CARD_W } from "@/lib/member-card-back-content";

/**
 * Layout reference (pre–credit-card size). Scaled by SX/SY so proportions hold at ID-1 aspect (MEMBER_CARD_*).
 */
const REF_W = 952;
const REF_H = 560;
const SX = CARD_W / REF_W;
const SY = CARD_H / REF_H;

/** ~5% horizontal inset; aligns logo, name, QR to same left edge */
const INSET_X = Math.round(48 * SX);
/** Space from red banner (right column) to member name */
const AFTER_BANNER_TO_NAME = Math.round(24 * SY);
/** Name → first location row */
const NAME_TO_LOCATION = Math.max(4, Math.round(6 * SY));
/** Tight stack between State/LG row, Ward */
const LOCATION_TIGHT = Math.max(1, Math.round(2 * SY));
/** Breathing room around membership No */
const NO_BLOCK_PAD_Y = Math.max(2, Math.round(4 * SY));
/** Tighter line height for member body copy */
const MEMBER_BODY_LINE_HEIGHT = 1.08;
/** QR ↔ Tel block */
const QR_TO_TEL = Math.round(18 * SX);
/** Logo column ↔ party / banner column */
const LOGO_TO_PARTY_GAP = Math.round(20 * SX);
/** Layout slot for logo (px) — keep fixed so party text + red bar position never shift */
const LOGO_LAYOUT_SLOT = Math.round(156 * SX);
/** Visual scale for logo only (does not change grid / body layout) */
const LOGO_VISUAL_SCALE = 1.5;
/** Nudge logo right (px) without changing grid column width */
const LOGO_NUDGE_RIGHT_PX = Math.round(36 * SX);
/** Party headline — one line, shared size */
const PARTY_HEADLINE_PX = Math.max(30, Math.round(42 * SX));
/** Red banner “Digital MEMBERSHIP CARD” */
const BANNER_TEXT_PX = Math.max(17, Math.round(25 * SY));
/** Inset red bar from the left (px) so it clears the enlarged logo visually */
const BANNER_INSET_LEFT_PX = Math.round(36 * SX);
/** Second grid column width (px) — fixed so html2canvas/off-screen layout matches on-screen (no % bugs) */
const HEADER_RIGHT_COL_W = CARD_W - INSET_X * 2 - LOGO_LAYOUT_SLOT - LOGO_TO_PARTY_GAP;
/** Red banner inner width (px) — explicit, avoids calc(100% - …) in raster capture */
const BANNER_AREA_WIDTH_PX = Math.max(100, HEADER_RIGHT_COL_W - BANNER_INSET_LEFT_PX);
/** System stack so preview and PNG/PDF use the same face metrics */
const CARD_SANS =
  'system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';
/** One size for name, location lines, membership No, Tel / Member since */
const MEMBER_BODY_TEXT_PX = Math.max(15, Math.round(22 * SY));
/** Member portrait frame (w × h) — card is fixed width; one size keeps layout predictable */
const PHOTO_W = Math.round(196 * SX);
const PHOTO_H = Math.round(272 * SY);
/** Main row gap (logo block ↔ photo) */
const MAIN_COLUMN_GAP = Math.round(40 * SX);
const HEADER_PADDING_TOP = Math.round(20 * SY);
const BANNER_PAD_Y = Math.max(7, Math.round(12 * SY));
const QR_SIZE = Math.max(96, Math.round(120 * SY));
/** Watermark — `public/membershipregistration/backgroundid.jpeg` */
const CARD_WATERMARK_SRC = "/membershipregistration/backgroundid.jpeg";
const CARD_WATERMARK_OPACITY = 0.17;

interface MemberCardProps {
  data: EnrollmentFormData;
  className?: string;
  showBarcode?: boolean;
  id?: string;
  /** Flat styling for html2canvas capture (drops heavy shadow so raster matches preview) */
  variant?: "screen" | "capture";
}

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

/** Registration title (Mr, Mrs, Dr, …) + full name for the ID card */
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

/** Reference palette */
const C = {
  label: "#808080",
  greenParty: "#008000",
  redBanner: "#FF0000",
  redId: "#CC0000",
  noLabel: "#FF8C00",
} as const;

const PARTY_HEADLINE_STYLE: CSSProperties = {
  color: C.greenParty,
  fontWeight: 800,
  fontFamily: CARD_SANS,
  /* Slight edge hint only — less heavy than full faux-bold */
  textShadow: "0.35px 0 0 currentColor, -0.35px 0 0 currentColor",
};

const BANNER_LINE_STYLE: CSSProperties = {
  margin: 0,
  textAlign: "center",
  color: "#FFFFFF",
  fontSize: BANNER_TEXT_PX,
  lineHeight: 1.2,
  fontWeight: 600,
  fontFamily: CARD_SANS,
};

export function MemberCard({
  data,
  className,
  showBarcode = true,
  id = "member-card",
  variant = "screen",
}: MemberCardProps) {
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
        width: QR_SIZE,
        margin: 1,
        color: { dark: "#000000", light: "#ffffff" },
      })
        .then(setQrDataUrl)
        .catch(() => {});
    });
  }, [showBarcode, membershipId]);

  const displayNameWithTitle = formatNameWithTitle(data);
  const memberSince = getMemberSinceLabel(data.joinDate);

  const fieldTextStyle: CSSProperties = {
    fontSize: MEMBER_BODY_TEXT_PX,
    lineHeight: MEMBER_BODY_LINE_HEIGHT,
    marginBottom: LOCATION_TIGHT,
    fontFamily: CARD_SANS,
  };

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white",
        variant === "capture" ? "shadow-none" : "shadow-xl",
        className
      )}
      style={{
        width: CARD_W,
        height: CARD_H,
        minWidth: CARD_W,
        minHeight: CARD_H,
        boxSizing: "border-box",
        fontFamily: CARD_SANS,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
      aria-label="Digital membership card"
    >
      <div
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `url(${CARD_WATERMARK_SRC})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity: CARD_WATERMARK_OPACITY,
        }}
        aria-hidden
      />
      {/* Header: logo only left column; party + red band right column (banner does not span under logo) */}
      <header
        className="relative z-[1] grid shrink-0 items-start"
        style={{
          paddingLeft: INSET_X,
          paddingRight: INSET_X,
          paddingTop: HEADER_PADDING_TOP,
          columnGap: LOGO_TO_PARTY_GAP,
          gridTemplateColumns: `${LOGO_LAYOUT_SLOT}px 1fr`,
        }}
      >
        <div className="flex flex-col">
          {/* Fixed slot size — logo drawn larger via scale + origin so body/main card layout unchanged */}
          <div
            className="relative z-[2] flex shrink-0 items-start justify-center overflow-visible"
            style={{ width: LOGO_LAYOUT_SLOT, height: LOGO_LAYOUT_SLOT }}
            aria-hidden
          >
            <img
              src="/sdplogo.jpg"
              alt="SDP logo"
              className="h-full w-full object-contain"
              style={{
                transform: `translateX(${LOGO_NUDGE_RIGHT_PX}px) scale(${LOGO_VISUAL_SCALE})`,
                transformOrigin: "right center",
              }}
            />
          </div>
        </div>

        <div className="relative min-w-0">
          <div className="relative z-[1] flex items-center justify-center px-2 pb-2 pt-0 text-center">
            <p
              className="m-0 whitespace-nowrap leading-tight tracking-tight"
              style={{ ...PARTY_HEADLINE_STYLE, fontSize: PARTY_HEADLINE_PX }}
            >
              Social Democratic Party<span className="mx-2 opacity-90" aria-hidden>
                ·
              </span>
              SDP
            </p>
          </div>
          <div
            className="relative z-[1] text-white"
            data-sdp-red-banner
            style={{
              backgroundColor: C.redBanner,
              marginLeft: BANNER_INSET_LEFT_PX,
              width: BANNER_AREA_WIDTH_PX,
              boxSizing: "border-box",
              paddingTop: BANNER_PAD_Y,
              paddingBottom: BANNER_PAD_Y,
              paddingLeft: 8,
              paddingRight: 8,
            }}
          >
            <p style={BANNER_LINE_STYLE}>
              <span style={{ fontWeight: 400 }}>Digital </span>
              <span
                style={{
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                MEMBERSHIP CARD
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* Main: left block + fixed-size portrait (top-aligned), same as earlier implementation */}
      <div
        className="relative z-[1] flex min-h-0 flex-1 flex-row items-start"
        style={{
          paddingLeft: INSET_X,
          paddingRight: INSET_X,
          paddingTop: AFTER_BANNER_TO_NAME,
          columnGap: MAIN_COLUMN_GAP,
        }}
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-between" style={{ paddingBottom: 10 }}>
          <div className="min-w-0">
            {/* 1. Name + registration title */}
            <p
              className="m-0 font-bold text-neutral-900"
              style={{
                ...fieldTextStyle,
                marginBottom: NAME_TO_LOCATION,
              }}
            >
              {displayNameWithTitle}
            </p>

            {/* 2. Membership ID */}
            <div style={{ paddingTop: 2, paddingBottom: NO_BLOCK_PAD_Y }}>
              <p className="m-0" style={{ ...fieldTextStyle, marginBottom: LOCATION_TIGHT }}>
                <span style={{ fontWeight: 600, color: C.noLabel }}>No: </span>
                <span style={{ fontWeight: 700, letterSpacing: "-0.02em", color: C.redId }}>
                  {membershipId || "—"}
                </span>
              </p>
            </div>

            {/* 3. State (own row) */}
            <p className="m-0" style={fieldTextStyle}>
              <span style={{ color: C.label }}>State: </span>
              <span className="font-bold text-neutral-900">{getStateName(data.state) || "—"}</span>
            </p>

            {/* 4. LGA — below state */}
            <p className="m-0" style={fieldTextStyle}>
              <span style={{ color: C.label }}>LG: </span>
              <span className="font-bold text-neutral-900">{formatSlugForDisplay(data.lga)}</span>
            </p>

            {/* 5. Ward */}
            <p className="m-0" style={fieldTextStyle}>
              <span style={{ color: C.label }}>Ward: </span>
              <span className="font-bold text-neutral-900">{formatSlugForDisplay(data.ward)}</span>
            </p>

            {/* 6. Polling Unit */}
            <p className="m-0" style={{ ...fieldTextStyle, marginBottom: 0 }}>
              <span style={{ color: C.label }}>Polling Unit: </span>
              <span className="font-bold text-neutral-900">{data.pollingUnit?.trim() || "—"}</span>
            </p>
          </div>

          {/* QR + Tel; member since on one line beside QR */}
          <div className="flex flex-row items-center" style={{ gap: QR_TO_TEL, marginTop: Math.max(4, Math.round(8 * SY)) }}>
            {showBarcode && membershipId ? (
              <div className="shrink-0 rounded-sm border border-neutral-300 bg-white p-0.5" aria-hidden>
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt=""
                    width={QR_SIZE}
                    height={QR_SIZE}
                    className="block"
                    style={{ width: QR_SIZE, height: QR_SIZE }}
                  />
                ) : (
                  <div
                    className="flex items-center justify-center text-xs text-neutral-400"
                    style={{ width: QR_SIZE, height: QR_SIZE }}
                  >
                    QR…
                  </div>
                )}
              </div>
            ) : (
              <div className="shrink-0" style={{ width: QR_SIZE }} />
            )}
            <div className="min-w-0 space-y-1">
              <p className="m-0" style={{ fontSize: MEMBER_BODY_TEXT_PX, lineHeight: MEMBER_BODY_LINE_HEIGHT }}>
                <span style={{ color: C.label }}>Tel: </span>
                <span className="font-bold text-neutral-900">{data.phone || "—"}</span>
              </p>
              <p className="m-0 whitespace-nowrap" style={{ fontSize: MEMBER_BODY_TEXT_PX, lineHeight: MEMBER_BODY_LINE_HEIGHT }}>
                <span style={{ color: C.label }}>Member since: </span>
                <span className="font-bold text-neutral-900">{memberSince}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Portrait: fixed frame, top-aligned (previous behaviour — not full column height) */}
        <div className="shrink-0 pt-0.5">
          <div className="overflow-hidden rounded-sm bg-neutral-100" style={{ width: PHOTO_W, height: PHOTO_H }}>
            {data.portraitDataUrl ? (
              <img src={data.portraitDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">Photo</div>
            )}
          </div>
        </div>
      </div>

      {/* Reference footer: thin red, then thicker green */}
      <div className="relative z-[1] mt-auto flex w-full shrink-0 flex-col">
        <div className="h-1 w-full" style={{ backgroundColor: C.redBanner }} />
        <div className="h-2.5 w-full" style={{ backgroundColor: C.greenParty }} />
      </div>
    </article>
  );
}
