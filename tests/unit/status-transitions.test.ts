import { InvoiceRequestStatus } from "@prisma/client";
import { describe, expect, it } from "vitest";

import {
  assertRequestTransition,
  isRequestEditable,
} from "@/modules/invoice-requests/domain/policy";

describe("invoice request state machine", () => {
  it.each([
    [InvoiceRequestStatus.PENDING_REVIEW, InvoiceRequestStatus.APPROVED],
    [InvoiceRequestStatus.PENDING_REVIEW, InvoiceRequestStatus.REJECTED],
    [InvoiceRequestStatus.REJECTED, InvoiceRequestStatus.PENDING_REVIEW],
    [InvoiceRequestStatus.APPROVED, InvoiceRequestStatus.PAID],
  ])("allows %s → %s", (from, to) =>
    expect(() => assertRequestTransition(from, to)).not.toThrow(),
  );

  it("locks paid requests permanently", () => {
    expect(isRequestEditable(InvoiceRequestStatus.PAID)).toBe(false);
    for (const status of Object.values(InvoiceRequestStatus)) {
      expect(() =>
        assertRequestTransition(InvoiceRequestStatus.PAID, status),
      ).toThrow();
    }
  });
});
