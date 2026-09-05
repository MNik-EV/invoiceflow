import type { InvoiceCategory, InvoiceRequestStatus } from "@prisma/client";
import { Cpu, Eye, Utensils } from "lucide-react";
import Link from "next/link";

import { RequestActions } from "@/components/admin/request-actions";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { formatJalaliDate } from "@/lib/i18n/date";
import { formatToman } from "@/lib/i18n/numbers";

export interface RequestRow {
  id: string;
  category: InvoiceCategory;
  title: string | null;
  vendorName: string | null;
  invoiceDate: Date;
  invoiceAmount: bigint;
  calculatedAmount: bigint | null;
  status: InvoiceRequestStatus;
  version: number;
  creator: { name: string };
  participants: Array<{ user: { name: string } }>;
}

function categoryLabel(category: InvoiceCategory) {
  return category === "LUNCH" ? "ناهار" : "خرید تخصصی";
}

export function RequestTable({
  requests,
  showCreator = false,
  adminActions = false,
}: {
  requests: RequestRow[];
  showCreator?: boolean;
  adminActions?: boolean;
}) {
  if (!requests.length)
    return (
      <div className="px-5 py-14 text-center text-sm text-slate-500">
        هنوز فاکتوری برای نمایش وجود ندارد.
      </div>
    );
  return (
    <>
      <div className="divide-y md:hidden">
        {requests.map((request) => {
          const Icon = request.category === "LUNCH" ? Utensils : Cpu;
          return (
            <Link
              key={request.id}
              href={`/invoices/${request.id}`}
              className="block p-4 transition hover:bg-orange-50/60 dark:hover:bg-orange-950/20"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 gap-3">
                  <span className="bg-primary/10 text-primary grid size-10 shrink-0 place-items-center rounded-xl">
                    <Icon className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {request.title || categoryLabel(request.category)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {formatJalaliDate(request.invoiceDate)} ·{" "}
                      {formatToman(request.invoiceAmount)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={request.status} />
              </div>
            </Link>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[820px] text-right text-sm">
          <thead className="bg-slate-50 text-xs text-slate-500 dark:bg-slate-900/50">
            <tr>
              <th className="px-5 py-3 font-semibold">نوع</th>
              <th className="px-5 py-3 font-semibold">تاریخ</th>
              {showCreator ? <th className="px-5 py-3">ثبت‌کننده</th> : null}
              <th className="px-5 py-3 font-semibold">شرح</th>
              <th className="px-5 py-3 font-semibold">مبلغ فاکتور</th>
              <th className="px-5 py-3 font-semibold">مبلغ تأییدشده</th>
              <th className="px-5 py-3 font-semibold">وضعیت</th>
              <th className="px-5 py-3">
                <span className="sr-only">عملیات</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {requests.map((request) => (
              <tr
                key={request.id}
                className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40"
              >
                <td className="px-5 py-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-2 font-semibold">
                    {request.category === "LUNCH" ? (
                      <Utensils className="text-primary size-4" />
                    ) : (
                      <Cpu className="text-primary size-4" />
                    )}
                    {categoryLabel(request.category)}
                  </span>
                </td>
                <td className="numeric px-5 py-4 whitespace-nowrap">
                  {formatJalaliDate(request.invoiceDate)}
                </td>
                {showCreator ? (
                  <td className="px-5 py-4">{request.creator.name}</td>
                ) : null}
                <td className="max-w-52 truncate px-5 py-4">
                  {request.title ||
                    request.vendorName ||
                    request.participants
                      .map((item) => item.user.name)
                      .join("، ") ||
                    "—"}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {formatToman(request.invoiceAmount)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {request.calculatedAmount === null
                    ? "—"
                    : formatToman(request.calculatedAmount)}
                </td>
                <td className="px-5 py-4">
                  <StatusBadge status={request.status} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex justify-end gap-2">
                    <Button asChild variant="ghost" size="icon">
                      <Link
                        href={`/invoices/${request.id}`}
                        aria-label="مشاهده جزئیات"
                      >
                        <Eye className="size-4" />
                      </Link>
                    </Button>
                    {adminActions ? (
                      <RequestActions
                        requestId={request.id}
                        version={request.version}
                        status={request.status}
                        amount={request.calculatedAmount?.toString() ?? null}
                        defaultPaymentDate={formatJalaliDate(new Date())}
                        category={request.category}
                        compact
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
