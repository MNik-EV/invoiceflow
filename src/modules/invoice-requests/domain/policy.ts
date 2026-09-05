import { InvoiceCategory, InvoiceRequestStatus } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";

export function calculateLunchReimbursement(
  invoiceAmount: bigint,
  participantCount: number,
  allowance: bigint,
): bigint {
  if (
    invoiceAmount <= 0n ||
    allowance <= 0n ||
    !Number.isInteger(participantCount) ||
    participantCount <= 0
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "اطلاعات محاسبه بازپرداخت معتبر نیست.",
      400,
    );
  }
  const ceiling = BigInt(participantCount) * allowance;
  return invoiceAmount < ceiling ? invoiceAmount : ceiling;
}

export function calculateApprovedAmount(input: {
  category: InvoiceCategory;
  invoiceAmount: bigint;
  participantCount: number;
  lunchAllowance?: bigint;
}): bigint {
  if (input.category === InvoiceCategory.LAB_PURCHASE) {
    if (input.invoiceAmount <= 0n)
      throw new AppError("VALIDATION_ERROR", "مبلغ فاکتور معتبر نیست.", 400);
    return input.invoiceAmount;
  }
  if (!input.lunchAllowance)
    throw new AppError(
      "VALIDATION_ERROR",
      "سهمیه ناهار پیکربندی نشده است.",
      500,
    );
  return calculateLunchReimbursement(
    input.invoiceAmount,
    input.participantCount,
    input.lunchAllowance,
  );
}

const transitions: Record<
  InvoiceRequestStatus,
  readonly InvoiceRequestStatus[]
> = {
  PENDING_REVIEW: [
    InvoiceRequestStatus.APPROVED,
    InvoiceRequestStatus.REJECTED,
  ],
  APPROVED: [InvoiceRequestStatus.PAID],
  REJECTED: [InvoiceRequestStatus.PENDING_REVIEW],
  PAID: [],
};

export function assertRequestTransition(
  from: InvoiceRequestStatus,
  to: InvoiceRequestStatus,
): void {
  if (!transitions[from].includes(to)) {
    throw new AppError(
      "INVALID_REQUEST_TRANSITION",
      "تغییر وضعیت درخواست امکان‌پذیر نیست.",
      409,
    );
  }
}

export function isRequestEditable(status: InvoiceRequestStatus): boolean {
  return status === InvoiceRequestStatus.REJECTED;
}
