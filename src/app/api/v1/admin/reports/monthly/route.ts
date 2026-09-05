import { AppError } from "@/lib/errors/app-error";
import { InvoiceCategory } from "@prisma/client";
import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import {
  ADMIN_ROLES,
  requireRole,
} from "@/modules/identity/domain/permissions";
import { requireIdentity } from "@/modules/identity/application/session";
import { getMonthlyReport } from "@/modules/reports/application/monthly-report";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const identity = await requireIdentity();
    requireRole(identity, ADMIN_ROLES);
    const params = new URL(request.url).searchParams;
    const year = Number(params.get("year"));
    const month = Number(params.get("month"));
    const categoryParam = params.get("category");
    const category = categoryParam
      ? (categoryParam as InvoiceCategory)
      : undefined;
    if (!Number.isInteger(year) || !Number.isInteger(month))
      throw new AppError("VALIDATION_ERROR", "ماه گزارش معتبر نیست.", 400);
    if (category && !Object.values(InvoiceCategory).includes(category))
      throw new AppError("VALIDATION_ERROR", "نوع فاکتور معتبر نیست.", 400);
    return { data: jsonSafe(await getMonthlyReport(year, month, category)) };
  });
}
