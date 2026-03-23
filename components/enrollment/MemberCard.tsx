"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { formatEnrollmentNameWithTitle, getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";
import { MEMBER_CARD_H as CARD_H, MEMBER_CARD_W as CARD_W } from "@/lib/member-card-back-content";
import {
  MEMBER_CARD_WATERMARK_OPACITY as CARD_WATERMARK_OPACITY,
  MEMBER_CARD_WATERMARK_URL as CARD_WATERMARK_URL,
} from "@/lib/member-card-watermark";

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
/** Location rows, Tel, member since */
const MEMBER_BODY_TEXT_PX = Math.max(15, Math.round(22 * SY));
/** Holder name — larger for readability */
const HOLDER_NAME_TEXT_PX = Math.max(19, Math.round(28 * SY));
/** Membership ID line (“No:” + number) */
const MEMBERSHIP_ID_TEXT_PX = Math.max(18, Math.round(25 * SY));
/** Member portrait frame (w × h) — card is fixed width; one size keeps layout predictable */
const PHOTO_W = Math.round(196 * SX);
const PHOTO_H = Math.round(272 * SY);
/** Main row gap (data column ↔ photo) — tighter for global ID–style grouping */
const MAIN_COLUMN_GAP = Math.round(22 * SX);
/** Vertical rhythm in holder data column */
const HOLDER_STACK_GAP = Math.max(3, Math.round(5 * SY));
const HEADER_PADDING_TOP = Math.round(20 * SY);
const BANNER_PAD_Y = Math.max(7, Math.round(12 * SY));
const QR_SIZE = Math.max(96, Math.round(120 * SY));

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

/** Single-line display cap (full value in title tooltip). */
const MAX_HOLDER_NAME_CHARS = 44;
const MAX_PHONE_DISPLAY_CHARS = 18;

function clipDisplay(s: string, maxChars: number): string {
  const t = s.trim();
  if (!t) return "—";
  if (t.length <= maxChars) return t;
  return `${t.slice(0, Math.max(1, maxChars - 1)).trimEnd()}…`;
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

  const fullNameWithTitle = formatEnrollmentNameWithTitle(data);
  const displayNameWithTitle = clipDisplay(fullNameWithTitle, MAX_HOLDER_NAME_CHARS);
  const memberSince = getMemberSinceLabel(data.joinDate);

  const stateFull = getStateName(data.state) || "—";

  const lgaFormatted = formatSlugForDisplay(data.lga);
  const lgaFull = lgaFormatted === "—" ? "—" : lgaFormatted.toUpperCase();

  const wardFull = formatSlugForDisplay(data.ward);

  const pollingRaw = data.pollingUnit?.trim() || "";
  const pollingFull = pollingRaw || "—";
  const pollingUpper = pollingRaw ? pollingRaw.toUpperCase() : "—";

  const phoneFull = data.phone?.trim() || "—";
  const phoneDisplay = clipDisplay(phoneFull, MAX_PHONE_DISPLAY_CHARS);

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
          backgroundImage: `url("${CARD_WATERMARK_URL}")`,
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

      {/* Main holder zone: data + machine-readable row grouped; photo flush — no justify-between gap */}
      <div
        data-sdp-member-body=""
        className="relative z-[1] flex min-h-0 flex-1 flex-row items-start"
        style={{
          paddingLeft: INSET_X,
          paddingRight: INSET_X,
          paddingTop: Math.max(6, AFTER_BANNER_TO_NAME - Math.round(4 * SY)),
          paddingBottom: Math.max(6, Math.round(8 * SY)),
          columnGap: MAIN_COLUMN_GAP,
        }}
      >
        <div
          className="flex min-h-0 min-w-0 flex-1 flex-col"
          style={{ gap: HOLDER_STACK_GAP, paddingBottom: 0 }}
        >
          {/* Holder name — one line ellipsis; full name on hover */}
          <p
            className="m-0 min-w-0 max-w-full font-bold text-neutral-900"
            style={{
              fontSize: HOLDER_NAME_TEXT_PX,
              lineHeight: MEMBER_BODY_LINE_HEIGHT,
              marginBottom: 0,
              fontFamily: CARD_SANS,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
            title={fullNameWithTitle !== displayNameWithTitle ? fullNameWithTitle : undefined}
          >
            {displayNameWithTitle}
          </p>

          {/* Membership ID — original format */}
          <div style={{ paddingTop: 2, paddingBottom: NO_BLOCK_PAD_Y }}>
            <p
              className="m-0"
              style={{
                fontSize: MEMBERSHIP_ID_TEXT_PX,
                lineHeight: MEMBER_BODY_LINE_HEIGHT,
                marginBottom: LOCATION_TIGHT,
                fontFamily: CARD_SANS,
              }}
            >
              <span style={{ fontWeight: 600, color: C.noLabel }}>No: </span>
              <span style={{ fontWeight: 700, letterSpacing: "-0.02em", color: C.redId }}>
                {membershipId || "—"}
              </span>
            </p>
          </div>

          {/* State | LGA and Ward | Polling — two columns, all left-aligned */}
          <div
            className="w-full min-w-0"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
              columnGap: Math.round(14 * SX),
              rowGap: Math.max(2, Math.round(4 * SY)),
              fontSize: MEMBER_BODY_TEXT_PX,
              lineHeight: MEMBER_BODY_LINE_HEIGHT,
              fontFamily: CARD_SANS,
            }}
          >
            <p className="m-0 min-w-0 overflow-hidden text-left text-ellipsis whitespace-nowrap" title={stateFull}>
              <span style={{ color: C.label }}>State: </span>
              <span className="font-bold text-neutral-900">{stateFull}</span>
            </p>
            <p
              className="m-0 min-w-0 overflow-hidden text-left text-ellipsis whitespace-nowrap"
              title={lgaFull !== "—" ? lgaFull : undefined}
            >
              <span style={{ color: C.label }}>LGA: </span>
              <span className="font-bold text-neutral-900">{lgaFull}</span>
            </p>
            <p
              className="m-0 min-w-0 overflow-hidden text-left text-ellipsis whitespace-nowrap"
              title={wardFull !== "—" ? wardFull : undefined}
            >
              <span style={{ color: C.label }}>Ward: </span>
              <span className="font-bold text-neutral-900">{wardFull}</span>
            </p>
            <p
              className="m-0 min-w-0 overflow-hidden text-left text-ellipsis whitespace-nowrap"
              title={pollingFull !== "—" ? pollingFull : undefined}
            >
              <span style={{ color: C.label }}>Polling Unit: </span>
              <span className="font-bold text-neutral-900">{pollingUpper}</span>
            </p>
          </div>

          {/* Machine-readable strip: QR + contact directly under address block (global ID pattern) */}
          <div
            className="flex min-w-0 flex-row items-center border-t border-neutral-200/90 pt-2"
            style={{ gap: QR_TO_TEL, marginTop: Math.max(2, Math.round(4 * SY)) }}
          >
            {showBarcode && membershipId ? (
              <div
                className="shrink-0 rounded border border-neutral-400/80 bg-white p-px shadow-sm"
                aria-hidden
              >
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
            <div className="min-w-0" style={{ display: "flex", flexDirection: "column", gap: Math.max(2, Math.round(4 * SY)) }}>
              <p
                className="m-0 min-w-0"
                style={{ fontSize: MEMBER_BODY_TEXT_PX, lineHeight: MEMBER_BODY_LINE_HEIGHT }}
                title={phoneFull !== phoneDisplay && phoneFull !== "—" ? phoneFull : undefined}
              >
                <span style={{ color: C.label }}>Tel: </span>
                <span className="font-bold text-neutral-900">{phoneDisplay}</span>
              </p>
              <p
                className="m-0 min-w-0 whitespace-nowrap"
                style={{ fontSize: MEMBER_BODY_TEXT_PX, lineHeight: MEMBER_BODY_LINE_HEIGHT }}
              >
                <span style={{ color: C.label }}>Member since: </span>
                <span className="font-bold text-neutral-900">{memberSince}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Portrait — ID photo frame, aligned with holder column top */}
        <div className="shrink-0 self-start">
          <div
            className="overflow-hidden rounded-sm bg-neutral-100 ring-1 ring-neutral-300/90"
            style={{ width: PHOTO_W, height: PHOTO_H }}
          >
            {data.portraitDataUrl ? (
              <img src={data.portraitDataUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">Photo</div>
            )}
          </div>
        </div>
      </div>

      {/* Reference footer: thin red, then thicker green (inline px for same look in preview + html2canvas) */}
      <div className="relative z-[1] mt-auto flex w-full shrink-0 flex-col" data-sdp-card-stripes="">
        <div
          className="w-full shrink-0"
          style={{
            height: Math.max(3, Math.round(4 * SY)),
            minHeight: Math.max(3, Math.round(4 * SY)),
            backgroundColor: C.redBanner,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        />
        <div
          className="w-full shrink-0"
          style={{
            height: Math.max(8, Math.round(10 * SY)),
            minHeight: Math.max(8, Math.round(10 * SY)),
            backgroundColor: C.greenParty,
            WebkitPrintColorAdjust: "exact",
            printColorAdjust: "exact",
          }}
        />
      </div>
    </article>
  );
}
