import { normalizePhone } from "@/lib/otp/termii";

/**
 * Nigerian mobile lines we accept after country code 234 (local 070/080/081/090/091…).
 * E.164: +234 + 10 digits starting with 70, 80, 81, 90, or 91.
 */
const NG_MOBILE_NATIONAL = /^(70|80|81|90|91)\d{8}$/;

export function isAllowedNigerianMobileNormalized(e164: string): boolean {
  if (!/^\+234[0-9]{10}$/.test(e164)) return false;
  const national = e164.slice(4);
  return NG_MOBILE_NATIONAL.test(national);
}

export function isValidEnrollmentNigerianPhone(raw: string): boolean {
  const n = normalizePhone(raw);
  if (!n) return false;
  return isAllowedNigerianMobileNormalized(n);
}
