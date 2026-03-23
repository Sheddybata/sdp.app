/**
 * Official copy for the digital membership card — reverse side.
 * Edit here to update text without changing layout components.
 */

/** Landscape + portrait backs — center-aligned layout per official design */
export const MEMBER_CARD_BACK = {
  line1: "This is an official membership card of the",
  line2: "SOCIAL DEMOCRATIC PARTY (SDP)",
  /** Split so “in Nigeria.” can sit on its own centered line */
  line3a:
    "If found, please return to any SDP Secretariat or the Nearest Police Station",
  line3b: "in Nigeria.",
  /** National HQ & contact block (footer, all lines center-aligned) */
  footerLines: [
    "SDP National Headquarters, 17 Nairobi Street, Wuse II, Abuja.",
    "Website: https://www.socialdemocraticparty.com.ng/",
    "Email: contact@socialdemocraticparty.com.ng",
    "WhatsApp: +2348093746",
    "Tel: +2347885554",
  ],
} as const;

/** Bottom stripes on card backs — green (thin) + orange (thick), aligned with card front + site brand */
export const MEMBER_CARD_BACK_STRIPE_GREEN = "#008000";
/** SDP primary — same as Tailwind `sdp.primary` / `--sdp-primary` (was #FF6600, which diverged from preview/UI). */
export const MEMBER_CARD_BACK_STRIPE_ORANGE = "#f48735";

/**
 * Landscape membership card — ISO/IEC 7810 ID-1 credit-card proportions (85.6mm × 53.98mm).
 * Width in px is fixed; height is derived so aspect ratio matches a physical card.
 */
const ID1_WIDTH_MM = 85.6;
const ID1_HEIGHT_MM = 53.98;
export const MEMBER_CARD_W = 856;
export const MEMBER_CARD_H = Math.round((MEMBER_CARD_W * ID1_HEIGHT_MM) / ID1_WIDTH_MM);

/** Portrait ID card (alternate layout) — front/back use same dimensions */
export const MEMBER_CARD_PORTRAIT_W = 640;
export const MEMBER_CARD_PORTRAIT_H = 1008;

const REF_L_H = 560;
const stripeScaleLandscape = MEMBER_CARD_H / REF_L_H;
/** Inline px heights so html2canvas/print match on-screen card (avoids rem rounding off-screen). */
export const MEMBER_CARD_L_STRIPE_THIN_PX = Math.max(3, Math.round(4 * stripeScaleLandscape));
export const MEMBER_CARD_L_STRIPE_THICK_PX = Math.max(8, Math.round(10 * stripeScaleLandscape));

const REF_P_H = 1008;
const stripeScalePortrait = MEMBER_CARD_PORTRAIT_H / REF_P_H;
export const MEMBER_CARD_P_STRIPE_THIN_PX = Math.max(3, Math.round(4 * stripeScalePortrait));
export const MEMBER_CARD_P_STRIPE_THICK_PX = Math.max(8, Math.round(10 * stripeScalePortrait));
/** Portrait front tricolour — middle white band */
export const MEMBER_CARD_P_TRICOLOR_MID_PX = Math.max(5, Math.round(6 * stripeScalePortrait));
