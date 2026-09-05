import { describe, expect, it } from "vitest";

import {
  isValidIranianCard,
  isValidIranianIban,
  normalizeCardNumber,
  normalizeIban,
} from "@/modules/users/domain/bank-validation";

describe("Iranian bank validation", () => {
  it("normalizes Persian card digits", () => {
    expect(normalizeCardNumber("۶۰۳۷-۹۹۷۵-۱۳۶۵-۷۰۹۹")).toBe("6037997513657099");
    expect(isValidIranianCard("6037997513657099")).toBe(true);
  });

  it("validates Iranian IBAN modulo 97", () => {
    expect(normalizeIban("ir06 2960 0000 0010 0324 2000 01")).toBe(
      "IR062960000000100324200001",
    );
    expect(isValidIranianIban("IR062960000000100324200001")).toBe(true);
    expect(isValidIranianIban("IR002960000000100324200001")).toBe(false);
  });
});
