/**
 * Official copy for the digital membership card — reverse side.
 * Edit here to update text without changing layout components.
 */

export const MEMBER_CARD_BACK = {
  headerLine1: "SOCIAL DEMOCRATIC PARTY (SDP)",
  headerLine2: "Digital Membership Identification",

  sectionTitle: "Terms of Use",

  ownershipHeading: "Ownership & Use:",
  ownershipBody:
    "This card remains the property of the Social Democratic Party (SDP). It is issued for the exclusive use of the named member and must be presented for party activities, conventions, and internal voting.",

  conductHeading: "Conduct:",
  conductBody:
    "Membership is subject to the provisions of the SDP Constitution. Misuse of this card or conduct contrary to party rules may lead to disciplinary action.",

  validationHeading: "Validation:",
  validationBodyPrefix: "To verify the authenticity of this membership, scan the QR code on the front or visit the official verification portal at ",
  verificationUrl: "https://www.socialdemocraticparty.app/",

  privacyHeading: "Privacy:",
  privacyBody:
    "Personal data is processed securely in accordance with the SDP Data Privacy Policy and national data protection regulations.",

  footerTitle: "Authority",
  issuedLine: "Issued under the Authority of the National Secretariat.",
  headquartersLine:
    "National Headquarters: National Secretariat, 17 Nairobi Street, Wuse II, Abuja.",

  chairman: {
    name: "Dr. Sadiq Umar Abubakar Gombe",
    title: "National Chairman",
    /** Secretary scan was under signature1 filename; PNG for transparent background */
    signatureSrc: "/membershipregistration/signature2.png",
  },
  secretary: {
    name: "Dr. Olu Agunloye",
    title: "National Secretary",
    signatureSrc: "/membershipregistration/signature1.png",
  },
} as const;

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
