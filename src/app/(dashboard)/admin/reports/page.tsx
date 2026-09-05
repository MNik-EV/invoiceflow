import { Download } from "lucide-react";
import { InvoiceCategory } from "@prisma/client";

import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { currentJalaliYearMonth, formatJalaliDate } from "@/lib/i18n/date";
import { formatToman } from "@/lib/i18n/numbers";
import { requirePageIdentity } from "@/modules/identity/application/session";
import {
  ADMIN_ROLES,
  requireRole,
} from "@/modules/identity/domain/permissions";
import { getMonthlyReport } from "@/modules/reports/application/monthly-report";

export const metadata = { title: "گزارش‌های مالی" };

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; category?: string }>;
}) {
  const identity = await requirePageIdentity();
  requireRole(identity, ADMIN_ROLES);
  const current = currentJalaliYearMonth();
  const query = await searchParams;
  const year = Number(query.year) || current.year;
  const month = Number(query.month) || current.month;
  const category = Object.values(InvoiceCategory).includes(
    query.category as InvoiceCategory,
  )
    ? (query.category as InvoiceCategory)
    : undefined;
  const rows = await getMonthlyReport(year, month, category);
  const base = `/api/v1/admin/reports/monthly/export?year=${year}&month=${month}${category ? `&category=${category}` : ""}`;
  return (
    <>
      <PageHeader
        title="گزارش‌های مالی"
        description="گزارش ماهانه فاکتورها، تأییدها و پرداخت‌ها"
        actions={
          <>
            <Button asChild variant="secondary">
              <a href={`${base}&format=csv`}>
                <Download className="size-4" />
                CSV
              </a>
            </Button>
            <Button asChild>
              <a href={`${base}&format=xlsx`}>
                <Download className="size-4" />
                Excel
              </a>
            </Button>
          </>
        }
      />
      <Card className="mb-5 p-5">
        <form className="flex flex-wrap items-end gap-4">
          <label className="text-sm font-semibold">
            سال شمسی
            <input
              name="year"
              type="number"
              min="1300"
              max="1600"
              defaultValue={year}
              className="focus-ring mt-2 block h-10 w-32 rounded-xl border px-3"
            />
          </label>
          <label className="text-sm font-semibold">
            نوع فاکتور
            <select
              name="category"
              defaultValue={category ?? ""}
              className="focus-ring mt-2 block h-10 rounded-xl border bg-white px-3 dark:bg-slate-950"
            >
              <option value="">همه فاکتورها</option>
              <option value="LUNCH">ناهار</option>
              <option value="LAB_PURCHASE">خرید تخصصی</option>
            </select>
          </label>
          <label className="text-sm font-semibold">
            ماه
            <input
              name="month"
              type="number"
              min="1"
              max="12"
              defaultValue={month}
              className="focus-ring mt-2 block h-10 w-24 rounded-xl border px-3"
            />
          </label>
          <Button type="submit">نمایش گزارش</Button>
        </form>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {[
                  "نوع",
                  "عنوان",
                  "تاریخ",
                  "درخواست‌کننده",
                  "شرکت‌کنندگان",
                  "فاکتور",
                  "بازپرداخت",
                  "وضعیت",
                  "پیگیری",
                ].map((label) => (
                  <th key={label} className="px-4 py-3">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="numeric px-4 py-3">
                    {row.category === "LUNCH" ? "ناهار" : "خرید تخصصی"}
                  </td>
                  <td className="max-w-48 truncate px-4 py-3">
                    {row.title || "—"}
                  </td>
                  <td className="numeric px-4 py-3">
                    {formatJalaliDate(row.invoiceDate)}
                  </td>
                  <td className="px-4 py-3 font-medium">{row.requester}</td>
                  <td className="max-w-72 truncate px-4 py-3">
                    {row.participants}
                  </td>
                  <td className="px-4 py-3">
                    {formatToman(row.invoiceAmount)}
                  </td>
                  <td className="px-4 py-3">
                    {row.calculatedAmount === null
                      ? "—"
                      : formatToman(row.calculatedAmount)}
                  </td>
                  <td className="px-4 py-3">{row.status}</td>
                  <td className="numeric px-4 py-3" dir="ltr">
                    {row.trackingCode || "—"}
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-12 text-center text-slate-500">
                    برای این ماه گزارشی وجود ندارد.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
