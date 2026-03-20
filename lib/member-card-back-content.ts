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

/** Same as front card for export/print alignment */
export const MEMBER_CARD_W = 952;
export const MEMBER_CARD_H = 560;
