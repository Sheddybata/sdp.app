/**
 * Membership card watermark — file must live under `public/membershipregistration/`.
 * Update the filename here if you replace the asset (keep same folder).
 */
export const MEMBER_CARD_WATERMARK_SRC = "/membershipregistration/backgroundid.png";

/**
 * Bump this whenever you save a new `backgroundid.png` (same filename).
 * Static files are cached aggressively; `?v=` forces browsers & CDNs to load the new image.
 */
export const MEMBER_CARD_WATERMARK_VERSION = "3";

/** Use this in `background-image: url(...)` everywhere the watermark appears. */
export const MEMBER_CARD_WATERMARK_URL = `${MEMBER_CARD_WATERMARK_SRC}?v=${MEMBER_CARD_WATERMARK_VERSION}`;

/** Higher = stronger watermark (preview + download). */
export const MEMBER_CARD_WATERMARK_OPACITY = 0.34;
