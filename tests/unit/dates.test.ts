import { describe, expect, it } from "vitest";

import {
  formatJalaliDate,
  jalaliMonthBounds,
  jalaliToDatabaseDate,
} from "@/lib/i18n/date";

describe("Jalali date boundary", () => {
  it("round-trips a Persian date through the Gregorian database value", () => {
    const databaseDate = jalaliToDatabaseDate("1405/06/01");
    expect(databaseDate.toISOString().slice(0, 10)).toBe("2026-08-23");
    expect(formatJalaliDate(databaseDate)).toBe("1405/06/01");
  });

  it("accepts Persian digits", () => {
    expect(formatJalaliDate(jalaliToDatabaseDate("۱۴۰۵/۰۶/۰۱"))).toBe(
      "1405/06/01",
    );
  });

  it("uses an exclusive next-month boundary", () => {
    const { start, end } = jalaliMonthBounds(1405, 12);
    expect(end > start).toBe(true);
    expect(formatJalaliDate(start)).toBe("1405/12/01");
    expect(formatJalaliDate(end)).toBe("1406/01/01");
  });
});
