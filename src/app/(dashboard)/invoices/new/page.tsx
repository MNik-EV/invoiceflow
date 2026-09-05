import type { InvoiceCategory } from "@prisma/client";
import { Cpu, Utensils } from "lucide-react";
import Link from "next/link";

import { InvoiceRequestForm } from "@/components/forms/invoice-request-form";
import { PageHeader } from "@/components/page-header";
import { formatJalaliDate } from "@/lib/i18n/date";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { listActiveParticipants } from "@/modules/invoice-requests/application/requests";
import { getAllowance } from "@/modules/settings/application/settings";

export const metadata = { title: "ثبت فاکتور" };

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  await requirePageIdentity();
  const query = await searchParams;
  const category: InvoiceCategory =
    query.category === "lab" ? "LAB_PURCHASE" : "LUNCH";
  const [participants, allowance] = await Promise.all([
    category === "LUNCH" ? listActiveParticipants() : Promise.resolve([]),
    getAllowance(),
  ]);
  return (
    <>
      <PageHeader
        title="ثبت فاکتور جدید"
        description="فقط اطلاعات ضروری را وارد کنید؛ بررسی و پیگیری با سامانه است."
      />
      <div className="mb-5 grid grid-cols-2 gap-2 rounded-2xl border bg-white p-2 shadow-sm dark:bg-slate-900">
        <Link
          href="/invoices/new?category=lunch"
          className={`focus-ring flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${category === "LUNCH" ? "bg-orange-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          <Utensils className="size-4" /> فاکتور ناهار
        </Link>
        <Link
          href="/invoices/new?category=lab"
          className={`focus-ring flex items-center justify-center gap-2 rounded-xl px-3 py-3 text-sm font-bold transition ${category === "LAB_PURCHASE" ? "bg-slate-900 text-white shadow-sm dark:bg-orange-600" : "text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"}`}
        >
          <Cpu className="size-4" /> خرید تخصصی
        </Link>
      </div>
      <InvoiceRequestForm
        category={category}
        participants={participants}
        allowance={allowance.toString()}
        defaultDate={formatJalaliDate(new Date())}
      />
    </>
  );
}
