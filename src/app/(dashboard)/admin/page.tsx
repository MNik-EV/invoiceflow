import { CheckCircle2, Clock3, Coins, WalletCards } from "lucide-react";
import { InvoiceCategory, InvoiceRequestStatus } from "@prisma/client";
import Link from "next/link";

import { PageHeader } from "@/components/page-header";
import { RequestTable } from "@/components/request-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatToman } from "@/lib/i18n/numbers";
import { getAdminDashboard } from "@/modules/dashboard/application/dashboard";
import { requirePageIdentity } from "@/modules/identity/application/session";
import {
  ADMIN_ROLES,
  requireRole,
} from "@/modules/identity/domain/permissions";
import { listInvoiceRequests } from "@/modules/invoice-requests/application/requests";
import { calculateApprovedAmount } from "@/modules/invoice-requests/domain/policy";
import { getAllowance } from "@/modules/settings/application/settings";

export const metadata = { title: "مدیریت فاکتورها" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; status?: string }>;
}) {
  const identity = await requirePageIdentity();
  requireRole(identity, ADMIN_ROLES);
  const query = await searchParams;
  const category = Object.values(InvoiceCategory).includes(
    query.category as InvoiceCategory,
  )
    ? (query.category as InvoiceCategory)
    : undefined;
  const status = Object.values(InvoiceRequestStatus).includes(
    query.status as InvoiceRequestStatus,
  )
    ? (query.status as InvoiceRequestStatus)
    : undefined;
  const [stats, requests, allowance] = await Promise.all([
    getAdminDashboard(),
    listInvoiceRequests(identity, { take: 100, category, status }),
    getAllowance(),
  ]);
  const displayRequests = requests.map((request) => ({
    ...request,
    calculatedAmount:
      request.calculatedAmount ??
      calculateApprovedAmount({
        category: request.category,
        invoiceAmount: request.invoiceAmount,
        participantCount: request.participants.length,
        lunchAllowance: allowance,
      }),
  }));
  const cards = [
    {
      label: "هزینه ماه جاری",
      value: formatToman(stats.monthlyTotal),
      icon: Coins,
      color: "bg-orange-100 text-orange-800",
    },
    {
      label: "در انتظار بررسی",
      value: new Intl.NumberFormat("fa-IR").format(stats.pending),
      icon: Clock3,
      color: "bg-amber-100 text-amber-800",
    },
    {
      label: "منتظر پرداخت",
      value: new Intl.NumberFormat("fa-IR").format(stats.approved),
      icon: WalletCards,
      color: "bg-blue-100 text-blue-800",
    },
    {
      label: "مجموع پرداخت‌شده",
      value: formatToman(stats.paidTotal),
      icon: CheckCircle2,
      color: "bg-emerald-100 text-emerald-800",
    },
  ];
  return (
    <>
      <PageHeader
        title="مدیریت فاکتورها"
        description="بررسی، تأیید و پرداخت فاکتورهای ناهار و خریدهای تخصصی"
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">{card.label}</p>
                <p className="mt-2 text-2xl font-black">{card.value}</p>
              </div>
              <span
                className={`grid size-11 place-items-center rounded-xl ${card.color}`}
              >
                <card.icon className="size-5" />
              </span>
            </CardContent>
          </Card>
        ))}
      </section>
      <nav className="mt-6 flex flex-wrap gap-2" aria-label="فیلتر فاکتورها">
        {[
          ["", "همه"],
          ["?status=PENDING_REVIEW", "در انتظار بررسی"],
          ["?status=APPROVED", "منتظر پرداخت"],
          ["?status=PAID", "پرداخت‌شده"],
          ["?category=LUNCH", "ناهار"],
          ["?category=LAB_PURCHASE", "خرید تخصصی"],
        ].map(([href, label]) => {
          const selected = href
            ? href.includes(`status=${status}`) ||
              href.includes(`category=${category}`)
            : !status && !category;
          return (
            <Link
              key={label}
              href={`/admin${href}`}
              className={`focus-ring rounded-full border px-4 py-2 text-sm font-semibold transition ${selected ? "border-orange-600 bg-orange-600 text-white" : "bg-white text-slate-600 hover:border-orange-300 dark:bg-slate-900"}`}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      <Card className="mt-6 overflow-hidden">
        <CardHeader>
          <CardTitle>درخواست‌ها</CardTitle>
        </CardHeader>
        <RequestTable requests={displayRequests} showCreator adminActions />
      </Card>
    </>
  );
}
