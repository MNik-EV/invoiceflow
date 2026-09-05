import { ArrowLeft, Cpu, History, Utensils } from "lucide-react";
import Link from "next/link";

import { RequestTable } from "@/components/request-table";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { listInvoiceRequests } from "@/modules/invoice-requests/application/requests";

export const metadata = { title: "خانه" };

export default async function DashboardPage() {
  const identity = await requirePageIdentity();
  const requests = await listInvoiceRequests(
    { ...identity, role: "USER" },
    { take: 8 },
  );
  const actions = [
    {
      href: "/invoices/new?category=lunch",
      title: "فاکتور ناهار",
      description: "تاریخ، افراد و دو تصویر را ثبت کنید.",
      icon: Utensils,
      gradient: "from-orange-500 to-amber-500",
    },
    {
      href: "/invoices/new?category=lab",
      title: "خرید تخصصی آزمایشگاه",
      description: "قطعه، ماژول، ابزار یا تجهیزات را ثبت کنید.",
      icon: Cpu,
      gradient: "from-slate-700 to-slate-900",
    },
  ];
  return (
    <>
      <section className="mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl shadow-orange-950/10 sm:p-8">
        <div className="max-w-2xl">
          <p className="text-sm text-orange-300">سلام {identity.name}</p>
          <h1 className="mt-2 text-2xl font-black sm:text-3xl">
            فاکتورت را سریع ثبت کن
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-300">
            نوع فاکتور را انتخاب کن، مدارک را بفرست و وضعیت پرداخت را همین‌جا
            ببین.
          </p>
        </div>
      </section>

      <section
        className="grid gap-4 md:grid-cols-2"
        aria-label="ثبت فاکتور جدید"
      >
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="focus-ring group overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:bg-slate-900"
          >
            <div className="flex items-center gap-4">
              <span
                className={`grid size-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${action.gradient} text-white shadow-lg`}
              >
                <action.icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-black">{action.title}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {action.description}
                </p>
              </div>
              <ArrowLeft className="size-5 text-slate-400 transition group-hover:-translate-x-1 group-hover:text-orange-600" />
            </div>
          </Link>
        ))}
      </section>

      <Card className="mt-6 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="text-primary size-5" />
            آخرین فاکتورها
          </CardTitle>
          <Link
            href="/invoices/history"
            className="text-primary text-sm font-bold hover:underline"
          >
            همه سوابق
          </Link>
        </CardHeader>
        <RequestTable requests={requests} />
      </Card>
    </>
  );
}
