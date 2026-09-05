import type { InvoiceCategory } from "@prisma/client";
import { FilePlus2 } from "lucide-react";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { listInvoiceRequests } from "@/modules/invoice-requests/application/requests";

export const metadata = { title: "سوابق من" };

export default async function InvoiceHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const identity = await requirePageIdentity();
  const selected = (await searchParams).category;
  const category: InvoiceCategory | undefined =
    selected === "lunch"
      ? "LUNCH"
      : selected === "lab"
        ? "LAB_PURCHASE"
        : undefined;
  const requests = await listInvoiceRequests(
    { ...identity, role: "USER" },
    { category },
  );
  return (
    <>
      <PageHeader
        title="سوابق من"
        description="فاکتورها و آخرین وضعیت بررسی یا پرداخت"
        actions={
          <Button asChild>
            <Link href="/invoices/new">
              <FilePlus2 className="size-4" /> ثبت فاکتور
            </Link>
          </Button>
        }
      />
      <div
        className="mb-4 flex gap-2 overflow-x-auto"
        aria-label="فیلتر نوع فاکتور"
      >
        {[
          ["", "همه"],
          ["lunch", "ناهار"],
          ["lab", "خرید تخصصی"],
        ].map(([value, label]) => (
          <Link
            key={value}
            href={
              value
                ? `/invoices/history?category=${value}`
                : "/invoices/history"
            }
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold ${selected === value || (!selected && !value) ? "border-orange-600 bg-orange-600 text-white" : "bg-white text-slate-600 dark:bg-slate-900"}`}
          >
            {label}
          </Link>
        ))}
      </div>
      <Card className="overflow-hidden">
        <RequestTable requests={requests} />
      </Card>
    </>
  );
}
