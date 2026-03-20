"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { format } from "date-fns";
import type { EnrollmentFormData } from "@/lib/enrollment-schema";
import { getMembershipIdFromData } from "@/lib/enrollment-schema";
import { NIGERIA_STATES } from "@/lib/nigeria-geo";
import { cn } from "@/lib/utils";

/** Fixed card — spacing derived from reference (~5% side margins on 952px) */
const CARD_W = 952;
const CARD_H = 560;
/** ~5% horizontal inset; aligns logo, name, QR to same left edge */
const INSET_X = 48;
/** Space from red banner (right column) to member name */
const AFTER_BANNER_TO_NAME = 24;
/** Name → first location row */
const NAME_TO_LOCATION = 6;
/** Tight stack between State/LG row, Ward */
const LOCATION_TIGHT = 2;
/** Breathing room around membership No */
const NO_BLOCK_PAD_Y = 4;
/** Tighter line height for member body copy */
const MEMBER_BODY_LINE_HEIGHT = 1.08;
/** QR ↔ Tel block */
const QR_TO_TEL = 18;
/** Logo column ↔ party / banner column */
const LOGO_TO_PARTY_GAP = 20;
/** Layout slot for logo (px) — keep fixed so party text + red bar position never shift */
const LOGO_LAYOUT_SLOT = 156;
/** Visual scale for logo only (does not change grid / body layout) */
const LOGO_VISUAL_SCALE = 1.5;
/** Nudge logo right (px) without changing grid column width */
const LOGO_NUDGE_RIGHT_PX = 36;
/** Party headline — one line, shared size */
const PARTY_HEADLINE_PX = 42;
/** Red banner “Digital MEMBERSHIP CARD” */
const BANNER_TEXT_PX = 25;
/** Inset red bar from the left (px) so it clears the enlarged logo visually */
const BANNER_INSET_LEFT_PX = 36;
/** One size for name, location lines, membership No, Tel / Member since */
const MEMBER_BODY_TEXT_PX = 22;
/** Member portrait frame (w × h) — card is fixed width; one size keeps layout predictable */
const PHOTO_W = 196;
const PHOTO_H = 272;
/** Watermark — `public/membershipregistration/backgroundid.jpeg` */
const CARD_WATERMARK_SRC = "/membershipregistration/backgroundid.jpeg";
const CARD_WATERMARK_OPACITY = 0.17;

interface MemberCardProps {
  data: EnrollmentFormData;
  className?: string;
  showBarcode?: boolean;
  id?: string;
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
  /* Slight edge hint only — less heavy than full faux-bold */
  textShadow: "0.35px 0 0 currentColor, -0.35px 0 0 currentColor",
};

export function MemberCard({ data, className, showBarcode = true, id = "member-card" }: MemberCardProps) {
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
        width: 128,
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
  };

  return (
    <article
      id={id}
      className={cn(
        "sdp-member-card relative flex flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-xl",
        className
      )}
      style={{
        width: CARD_W,
        height: CARD_H,
        minWidth: CARD_W,
        minHeight: CARD_H,
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
          paddingTop: 20,
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
              className="m-0 whitespace-nowrap font-extrabold leading-tight tracking-tight antialiased"
              style={{ ...PARTY_HEADLINE_STYLE, fontSize: PARTY_HEADLINE_PX }}
            >
              Social Democratic Party<span className="mx-2 opacity-90" aria-hidden>
                ·
              </span>
              SDP
            </p>
          </div>
          <div
            className="relative z-[1] py-3 text-white"
            style={{
              backgroundColor: C.redBanner,
              marginLeft: BANNER_INSET_LEFT_PX,
              width: `calc(100% - ${BANNER_INSET_LEFT_PX}px)`,
            }}
          >
            <p className="m-0 text-center font-semibold leading-tight" style={{ fontSize: BANNER_TEXT_PX }}>
              <span className="font-normal">Digital </span>
              <span className="font-bold uppercase tracking-[0.06em]">MEMBERSHIP CARD</span>
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
          columnGap: 40,
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
                <span className="font-semibold" style={{ color: C.noLabel }}>
                  No:{" "}
                </span>
                <span className="font-bold tracking-tight" style={{ color: C.redId }}>
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
          <div className="flex flex-row items-center" style={{ gap: QR_TO_TEL, marginTop: 8 }}>
            {showBarcode && membershipId ? (
              <div className="shrink-0 rounded-sm border border-neutral-300 bg-white p-0.5" aria-hidden>
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="" width={120} height={120} className="block size-[120px]" />
                ) : (
                  <div className="flex size-[120px] items-center justify-center text-xs text-neutral-400">QR…</div>
                )}
              </div>
            ) : (
              <div className="w-[120px] shrink-0" />
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
