import { parseISO, isValid, subYears, startOfDay, max, min } from "date-fns";

/** DOB: at least 1925, at most 110 years old, at least 18, and not after end of 2008 calendar where that is stricter. */
export function getDobBounds(): { min: Date; max: Date } {
  const today = startOfDay(new Date());
  const floor1925 = new Date(1925, 0, 1);
  const oldestAllowed = startOfDay(subYears(today, 110));
  const minD = max([floor1925, oldestAllowed]);
  const capEnd2008 = new Date(2008, 11, 31);
  const youngest18 = startOfDay(subYears(today, 18));
  const maxD = min([capEnd2008, youngest18]);
  return { min: minD, max: maxD };
}

export function isDobWithinEnrollmentRules(isoDate: string): boolean {
  const d = parseISO(isoDate);
  if (!isValid(d)) return false;
  const day = startOfDay(d);
  const { min, max } = getDobBounds();
  return day >= min && day <= max;
}

/** Membership join: month + year only, stored as YYYY-MM-01; from Jan 2010 through current month. */
export const JOIN_YEAR_MIN = 2010;
export const JOIN_MONTH_MIN = 1;

export function getJoinMonthYearMax(): { year: number; month: number } {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** True if YYYY-MM-01 is within [2010-01 .. current month]. */
export function isValidJoinMonthYearIso(isoFirstOfMonth: string): boolean {
  if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(isoFirstOfMonth)) return false;
  const d = parseISO(isoFirstOfMonth);
  if (!isValid(d)) return false;
  const t = startOfDay(d);
  const min = new Date(2010, 0, 1);
  const { year: yMax, month: mMax } = getJoinMonthYearMax();
  const max = new Date(yMax, mMax - 1, 1);
  return t >= min && t <= max;
}
