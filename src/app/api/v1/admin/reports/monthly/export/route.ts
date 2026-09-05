import { NextResponse } from "next/server";
import { InvoiceCategory } from "@prisma/client";

import { AppError, toErrorResponse } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/application/write-audit";
import {
  ADMIN_ROLES,
  requireRole,
} from "@/modules/identity/domain/permissions";
import { requireIdentity } from "@/modules/identity/application/session";
import {
  createCsv,
  createXlsx,
  getMonthlyReport,
} from "@/modules/reports/application/monthly-report";

export async function GET(request: Request) {
  const context = await getRequestContext();
  try {
    const identity = await requireIdentity();
    requireRole(identity, ADMIN_ROLES);
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year"));
    const month = Number(params.get("month"));
    const format = params.get("format");
    const categoryParam = params.get("category");
    const category = categoryParam
      ? (categoryParam as InvoiceCategory)
      : undefined;
    if (
      !Number.isInteger(year) ||
      !Number.isInteger(month) ||
      !["csv", "xlsx"].includes(format ?? "") ||
      (category !== undefined &&
        !Object.values(InvoiceCategory).includes(category))
    ) {
      throw new AppError(
        "VALIDATION_ERROR",
        "پارامترهای خروجی معتبر نیست.",
        400,
      );
    }
    const rows = await getMonthlyReport(year, month, category);
    const bytes = format === "csv" ? createCsv(rows) : await createXlsx(rows);
    await prisma.$transaction((tx) =>
      writeAudit(tx, {
        userId: identity.userId,
        action: "REPORT_EXPORTED",
        entity: "MonthlyReport",
        metadata: {
          year,
          month,
          category,
          format: format!,
          rowCount: rows.length,
        },
        ...context,
      }),
    );
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type":
          format === "csv"
            ? "text/csv; charset=utf-8"
            : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="invoice-report-${year}-${String(month).padStart(2, "0")}.${format}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "x-request-id": context.correlationId,
      },
    });
  } catch (error) {
    const response = toErrorResponse(error, context.correlationId);
    return NextResponse.json(response.body, { status: response.status });
  }
}
