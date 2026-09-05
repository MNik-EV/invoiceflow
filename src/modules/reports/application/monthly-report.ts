import ExcelJS from "exceljs";

import { jalaliMonthBounds, formatJalaliDate } from "@/lib/i18n/date";
import { prisma } from "@/lib/db/prisma";

export async function getMonthlyReport(
  year: number,
  month: number,
  category?: "LUNCH" | "LAB_PURCHASE",
) {
  const { start, end } = jalaliMonthBounds(year, month);
  const rows = await prisma.invoiceRequest.findMany({
    where: {
      invoiceDate: { gte: start, lt: end },
      ...(category ? { category } : {}),
    },
    include: {
      creator: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { name: true } } },
        orderBy: { user: { name: "asc" } },
      },
      payment: true,
      attachments: { select: { id: true, type: true } },
    },
    orderBy: [{ invoiceDate: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((request) => ({
    id: request.id,
    category: request.category,
    title: request.title ?? "",
    invoiceDate: request.invoiceDate,
    requester: request.creator.name,
    participants: request.participants.map((item) => item.user.name).join("، "),
    participantCount: request.participants.length,
    invoiceAmount: request.invoiceAmount,
    calculatedAmount: request.calculatedAmount,
    status: request.status,
    paidOn: request.payment?.paidOn ?? null,
    trackingCode: request.payment?.trackingCode ?? "",
    attachments: request.attachments
      .map((item) => `${item.type}:${item.id}`)
      .join(" | "),
  }));
}

const headers = [
  "نوع فاکتور",
  "عنوان",
  "تاریخ فاکتور",
  "درخواست‌کننده",
  "شرکت‌کنندگان",
  "تعداد",
  "مبلغ فاکتور (تومان)",
  "مبلغ بازپرداخت (تومان)",
  "وضعیت",
  "تاریخ پرداخت",
  "شماره پیگیری",
  "ارجاع مدارک",
];

const statusLabel = {
  PENDING_REVIEW: "در انتظار بررسی",
  APPROVED: "تأییدشده",
  REJECTED: "ردشده",
  PAID: "پرداخت‌شده",
} as const;

function safeSpreadsheetText(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

function rowValues(
  row: Awaited<ReturnType<typeof getMonthlyReport>>[number],
): Array<string | number> {
  return [
    row.category === "LUNCH" ? "ناهار" : "خرید تخصصی",
    safeSpreadsheetText(row.title),
    formatJalaliDate(row.invoiceDate),
    safeSpreadsheetText(row.requester),
    safeSpreadsheetText(row.participants),
    row.participantCount,
    row.invoiceAmount.toString(),
    row.calculatedAmount?.toString() ?? "",
    statusLabel[row.status],
    row.paidOn ? formatJalaliDate(row.paidOn) : "",
    safeSpreadsheetText(row.trackingCode),
    safeSpreadsheetText(row.attachments),
  ];
}

export function createCsv(
  rows: Awaited<ReturnType<typeof getMonthlyReport>>,
): Buffer {
  const escape = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`;
  const content = [headers, ...rows.map(rowValues)]
    .map((row) => row.map(escape).join(","))
    .join("\r\n");
  return Buffer.from(`\uFEFF${content}`, "utf8");
}

export async function createXlsx(
  rows: Awaited<ReturnType<typeof getMonthlyReport>>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Invoice Management";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("گزارش فاکتورها", {
    views: [{ rightToLeft: true, state: "frozen", ySplit: 1 }],
  });
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(rowValues(row));
  sheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC2410C" },
  };
  sheet.columns = [16, 30, 14, 22, 45, 10, 22, 25, 20, 15, 22, 55].map(
    (width) => ({
      width,
    }),
  );
  sheet.eachRow((row) => {
    row.alignment = { vertical: "middle", horizontal: "right", wrapText: true };
  });
  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
