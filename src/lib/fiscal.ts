/** Fiscal-year helpers. The start month is configurable in Settings. */

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const DEFAULT_FISCAL_START_MONTH = 9;

/** First day of the month a date falls in, as `YYYY-MM-01`. */
export function monthKey(dateIso: string): string {
  return `${dateIso.slice(0, 7)}-01`;
}

function addMonths(monthIso: string, count: number): string {
  const year = Number(monthIso.slice(0, 4));
  const month = Number(monthIso.slice(5, 7)) - 1 + count;
  const y = year + Math.floor(month / 12);
  const m = ((month % 12) + 12) % 12;
  return `${y}-${String(m + 1).padStart(2, "0")}-01`;
}

/** Inclusive list of month keys from one month to another. */
export function monthsBetween(startIso: string, endIso: string, cap = 240): string[] {
  const start = monthKey(startIso);
  const end = monthKey(endIso);
  if (end < start) return [start];
  const months: string[] = [];
  let cursor = start;
  while (cursor <= end && months.length < cap) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
  }
  return months;
}

/** Which fiscal year a date belongs to; the year is the one the period ends in. */
export function fiscalYearOf(dateIso: string, startMonth: number): number {
  const year = Number(dateIso.slice(0, 4));
  const month = Number(dateIso.slice(5, 7));
  if (startMonth === 1) return year;
  return month >= startMonth ? year + 1 : year;
}

export function fiscalYearStart(fiscalYear: number, startMonth: number): string {
  const year = startMonth === 1 ? fiscalYear : fiscalYear - 1;
  return `${year}-${String(startMonth).padStart(2, "0")}-01`;
}

/** The 12 month buckets of a fiscal year, earliest first. */
export function fiscalMonths(fiscalYear: number, startMonth: number): string[] {
  const start = fiscalYearStart(fiscalYear, startMonth);
  return Array.from({ length: 12 }, (_, index) => addMonths(start, index));
}

export function fiscalYearLabel(fiscalYear: number): string {
  return `FY${String(fiscalYear).slice(2)}`;
}

export function monthLabel(monthIso: string): string {
  const month = Number(monthIso.slice(5, 7)) - 1;
  return `${(MONTH_NAMES[month] ?? "").slice(0, 3)} ${monthIso.slice(2, 4)}`;
}

export function fiscalRangeText(fiscalYear: number, startMonth: number): string {
  const months = fiscalMonths(fiscalYear, startMonth);
  const first = months[0] ?? "";
  const last = months[11] ?? "";
  return `${monthLabel(first)} – ${monthLabel(last)}`;
}
