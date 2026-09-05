import { format, isValid, parse } from "date-fns-jalali";

import { normalizeDigits } from "@/lib/i18n/numbers";

const JALALI_PATTERN = "yyyy/MM/dd";

export function jalaliToDatabaseDate(value: string): Date {
  const normalized = normalizeDigits(value.trim()).replaceAll("-", "/");
  const parsed = parse(normalized, JALALI_PATTERN, new Date(0));
  if (!isValid(parsed) || format(parsed, JALALI_PATTERN) !== normalized) {
    throw new Error("INVALID_JALALI_DATE");
  }
  return new Date(
    Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()),
  );
}

export function formatJalaliDate(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, JALALI_PATTERN);
}

export function formatJalaliDateTime(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tehran",
  }).format(date);
}

export function jalaliMonthBounds(
  year: number,
  month: number,
): { start: Date; end: Date } {
  if (
    !Number.isInteger(year) ||
    year < 1300 ||
    year > 1600 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error("INVALID_JALALI_MONTH");
  }
  const start = jalaliToDatabaseDate(
    `${year}/${String(month).padStart(2, "0")}/01`,
  );
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;
  const end = jalaliToDatabaseDate(
    `${nextYear}/${String(nextMonth).padStart(2, "0")}/01`,
  );
  return { start, end };
}

export function currentJalaliYearMonth(): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year: "numeric",
    month: "numeric",
    timeZone: "Asia/Tehran",
  }).formatToParts(new Date());
  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
  };
}
