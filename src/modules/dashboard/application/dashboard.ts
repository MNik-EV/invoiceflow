import { InvoiceRequestStatus } from "@prisma/client";

import { currentJalaliYearMonth, jalaliMonthBounds } from "@/lib/i18n/date";
import { prisma } from "@/lib/db/prisma";

export async function getAdminDashboard() {
  const { year, month } = currentJalaliYearMonth();
  const { start, end } = jalaliMonthBounds(year, month);
  const [pending, approved, paid, monthly, paidAmount] =
    await prisma.$transaction([
      prisma.invoiceRequest.count({
        where: { status: InvoiceRequestStatus.PENDING_REVIEW },
      }),
      prisma.invoiceRequest.count({
        where: { status: InvoiceRequestStatus.APPROVED },
      }),
      prisma.invoiceRequest.count({
        where: { status: InvoiceRequestStatus.PAID },
      }),
      prisma.invoiceRequest.aggregate({
        where: {
          invoiceDate: { gte: start, lt: end },
          status: {
            in: [InvoiceRequestStatus.APPROVED, InvoiceRequestStatus.PAID],
          },
        },
        _sum: { calculatedAmount: true },
      }),
      prisma.payment.aggregate({ _sum: { amount: true } }),
    ]);
  return {
    pending,
    approved,
    paidCount: paid,
    paidTotal: paidAmount._sum.amount ?? 0n,
    monthlyTotal: monthly._sum.calculatedAmount ?? 0n,
    year,
    month,
  };
}
