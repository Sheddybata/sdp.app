export const DEFAULT_MONTHLY_DUE_NGN = 300;
export const MEMBERSHIP_DUES_START_DATE_ISO = "2024-01-01";

function parseISODateOnly(isoDate: string): Date | null {
  if (!isoDate) return null;
  // Expect YYYY-MM-DD
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(d)) return null;
  // Use UTC midnight to avoid timezone drift.
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (Number.isNaN(dt.getTime())) return null;
  return dt;
}

function monthsDiffInclusiveUTC(fromUTC: Date, toUTC: Date): number {
  const y1 = fromUTC.getUTCFullYear();
  const m1 = fromUTC.getUTCMonth();
  const y2 = toUTC.getUTCFullYear();
  const m2 = toUTC.getUTCMonth();
  return (y2 - y1) * 12 + (m2 - m1) + 1; // inclusive of current month
}

export function calculateMembershipDues(opts: {
  joinDateISO: string;
  today?: Date;
  monthlyDue?: number;
}): { monthsOwed: number; amountOwed: number; monthlyDue: number } {
  const monthlyDue = Number.isFinite(opts.monthlyDue) ? (opts.monthlyDue as number) : DEFAULT_MONTHLY_DUE_NGN;
  const today = opts.today ?? new Date();
  const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const joinUTC =
    parseISODateOnly(opts.joinDateISO) ??
    new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

  // Policy: we only collect dues from 2024-01-01 onward.
  const startUTC =
    parseISODateOnly(MEMBERSHIP_DUES_START_DATE_ISO) ??
    new Date(Date.UTC(2024, 0, 1));

  // Clamp effective join date:
  // - older members: start from 2024-01-01
  // - accidental future dates: clamp down to today
  const effectiveJoinUTC = new Date(
    Math.min(
      todayUTC.getTime(),
      Math.max(startUTC.getTime(), joinUTC.getTime())
    )
  );

  const rawMonths = monthsDiffInclusiveUTC(effectiveJoinUTC, todayUTC);
  const monthsOwed = Math.max(1, rawMonths);
  const amountOwed = Math.max(0, monthsOwed * monthlyDue);

  return { monthsOwed, amountOwed, monthlyDue };
}

