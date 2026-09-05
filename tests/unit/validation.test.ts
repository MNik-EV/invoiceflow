import { describe, expect, it } from "vitest";

import { requestInputSchema } from "@/modules/invoice-requests/application/validation";
import { validateSettingValue } from "@/modules/settings/domain/settings";

describe("input validation", () => {
  it("requires participants and a positive invoice", () => {
    const result = requestInputSchema.safeParse({
      category: "LUNCH",
      invoiceDate: "1405/06/01",
      participantIds: [],
      invoiceAmount: "0",
      description: "",
      duplicateConfirmed: false,
    });
    expect(result.success).toBe(false);
  });

  it("accepts a complete specialist purchase without participants", () => {
    const result = requestInputSchema.safeParse({
      category: "LAB_PURCHASE",
      invoiceDate: "1405/06/01",
      title: "ماژول توسعه",
      purchaseCategory: "MODULE",
      participantIds: [],
      invoiceAmount: "1200000",
      duplicateConfirmed: false,
    });
    expect(result.success).toBe(true);
  });

  it("normalizes a valid allowance and rejects unknown setting keys", () => {
    expect(validateSettingValue("lunch.allowance_toman", "0350000").value).toBe(
      "350000",
    );
    expect(() =>
      validateSettingValue("general.expense_limit", "100"),
    ).toThrow();
  });
});
