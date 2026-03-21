# Membership card assets

Place these files here for the digital ID card:

| File | Used on |
|------|---------|
| `backgroundid.png` | Front & back watermark — path in `lib/member-card-watermark.ts`. After replacing the file (same name), **bump `MEMBER_CARD_WATERMARK_VERSION`** there so the new image loads (cache bust). |
| `signature1.png` | National Secretary signature (Dr. Olu Agunloye) — transparent PNG |
| `signature2.png` | National Chairman signature (Dr. Sadiq Umar Abubakar Gombe) — transparent PNG |

If a signature image is missing, the card shows a blank signature line instead.

Copy text and signatory names are editable in `lib/member-card-back-content.ts`.
