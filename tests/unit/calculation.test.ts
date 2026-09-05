import { describe, expect, it } from "vitest";

import { InvoiceCategory } from "@prisma/client";
import {
  calculateApprovedAmount,
  calculateLunchReimbursement,
} from "@/modules/invoice-requests/domain/policy";

describe("invoice reimbursement calculations", () => {
  it("caps reimbursement at participants times allowance", () => {
    expect(calculateLunchReimbursement(2_000_000n, 4, 350_000n)).toBe(
      1_400_000n,
    );
  });

  it("reimburses the invoice when it is below the allowance ceiling", () => {
    expect(calculateLunchReimbursement(900_000n, 4, 350_000n)).toBe(900_000n);
  });

  it("rejects non-positive financial input", () => {
    expect(() => calculateLunchReimbursement(0n, 1, 350_000n)).toThrow();
    expect(() => calculateLunchReimbursement(100n, 0, 350_000n)).toThrow();
  });

  it("uses the full invoice amount for a specialist purchase", () => {
    expect(
      calculateApprovedAmount({
        category: InvoiceCategory.LAB_PURCHASE,
        invoiceAmount: 8_750_000n,
        participantCount: 0,
      }),
    ).toBe(8_750_000n);
  });
});
