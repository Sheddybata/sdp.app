/** Regional Indicator Symbol pair from ISO 3166-1 alpha-2 (e.g. NG → 🇳🇬). */
export function flagEmoji(iso2: string): string {
  const u = iso2.trim().toUpperCase();
  if (u.length !== 2) return "";
  const A = 0x1f1e6;
  return (
    String.fromCodePoint(A + u.charCodeAt(0) - 65) +
    String.fromCodePoint(A + u.charCodeAt(1) - 65)
  );
}
