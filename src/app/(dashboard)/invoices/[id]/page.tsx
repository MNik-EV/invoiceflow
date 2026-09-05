import { AttachmentType, InvoiceRequestStatus } from "@prisma/client";
import { ArrowRight, Download, Edit3, LockKeyhole } from "lucide-react";
import Link from "next/link";

import { RequestActions } from "@/components/admin/request-actions";
import { InvoiceRequestForm } from "@/components/forms/invoice-request-form";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatJalaliDate, formatJalaliDateTime } from "@/lib/i18n/date";
import { formatToman } from "@/lib/i18n/numbers";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { isFinanceAdmin } from "@/modules/identity/domain/permissions";
import {
  getInvoiceRequest,
  listActiveParticipants,
} from "@/modules/invoice-requests/application/requests";
import { getAllowance } from "@/modules/settings/application/settings";
import { getPayeeBankProfile } from "@/modules/users/application/bank";

const attachmentLabels: Record<AttachmentType, string> = {
  INVOICE: "فاکتور رستوران",
  PAYMENT_PROOF: "رسید پرداخت",
  FOOD_IMAGE: "تصویر غذا",
  SUPPORTING_DOCUMENT: "مدرک تکمیلی",
};

export default async function InvoiceRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const identity = await requirePageIdentity();
  const request = await getInvoiceRequest(identity, (await params).id);
  const editing =
    (await searchParams).edit === "1" &&
    request.status === InvoiceRequestStatus.REJECTED &&
    request.creatorId === identity.userId;
  if (editing) {
    const [participants, allowance] = await Promise.all([
      listActiveParticipants(),
      getAllowance(),
    ]);
    return (
      <>
        <PageHeader
          title="اصلاح درخواست ردشده"
          description={request.rejectionReason ?? undefined}
        />
        <InvoiceRequestForm
          requestId={request.id}
          category={request.category}
          participants={participants}
          allowance={allowance.toString()}
          defaultDate={formatJalaliDate(request.invoiceDate)}
          initialValues={{
            invoiceDate: formatJalaliDate(request.invoiceDate),
            title: request.title ?? "",
            vendorName: request.vendorName ?? "",
            purchaseCategory: request.purchaseCategory ?? "",
            participantIds: request.participants.map((item) => item.userId),
            invoiceAmount: request.invoiceAmount.toString(),
            description: request.description ?? "",
            version: request.version,
          }}
        />
      </>
    );
  }
  const admin = isFinanceAdmin(identity.role);
  const bank = admin ? await getPayeeBankProfile(request.creatorId) : null;
  return (
    <>
      <PageHeader
        title={
          request.category === "LUNCH"
            ? "جزئیات فاکتور ناهار"
            : "جزئیات خرید تخصصی"
        }
        description={`شناسه: ${request.id}`}
        actions={
          <>
            <Button asChild variant="secondary">
              <Link href={admin ? "/admin" : "/invoices/history"}>
                <ArrowRight className="size-4" />
                بازگشت
              </Link>
            </Button>
            {request.status === "REJECTED" &&
            request.creatorId === identity.userId ? (
              <Button asChild>
                <Link href={`/invoices/${request.id}?edit=1`}>
                  <Edit3 className="size-4" />
                  اصلاح درخواست
                </Link>
              </Button>
            ) : null}
            {admin ? (
              <RequestActions
                requestId={request.id}
                version={request.version}
                status={request.status}
                amount={request.calculatedAmount?.toString() ?? null}
                defaultPaymentDate={formatJalaliDate(new Date())}
                category={request.category}
              />
            ) : null}
          </>
        }
      />
      {request.status === "REJECTED" ? (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">
          <p className="font-bold text-red-900">دلیل رد درخواست</p>
          <p className="mt-2 text-sm leading-7 text-red-800">
            {request.rejectionReason}
          </p>
        </div>
      ) : null}
      {request.status === "PAID" ? (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <LockKeyhole className="size-5" />
          این سابقه مالی پرداخت و قفل شده است.
        </div>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>اطلاعات درخواست</CardTitle>
              <StatusBadge status={request.status} />
            </CardHeader>
            <CardContent>
              <dl className="grid gap-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-slate-500">تاریخ فاکتور</dt>
                  <dd className="numeric mt-1 font-bold">
                    {formatJalaliDate(request.invoiceDate)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">نوع فاکتور</dt>
                  <dd className="mt-1 font-bold">
                    {request.category === "LUNCH"
                      ? "ناهار"
                      : "خرید تخصصی آزمایشگاه"}
                  </dd>
                </div>
                {request.title ? (
                  <div>
                    <dt className="text-xs text-slate-500">عنوان خرید</dt>
                    <dd className="mt-1 font-bold">{request.title}</dd>
                  </div>
                ) : null}
                {request.vendorName ? (
                  <div>
                    <dt className="text-xs text-slate-500">فروشنده</dt>
                    <dd className="mt-1 font-bold">{request.vendorName}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="text-xs text-slate-500">درخواست‌کننده</dt>
                  <dd className="mt-1 font-bold">{request.creator.name}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">مبلغ فاکتور</dt>
                  <dd className="mt-1 font-bold">
                    {formatToman(request.invoiceAmount)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">مبلغ بازپرداخت</dt>
                  <dd className="mt-1 font-bold text-orange-800">
                    {request.calculatedAmount === null
                      ? "هنوز محاسبه نشده"
                      : formatToman(request.calculatedAmount)}
                  </dd>
                </div>
                {request.category === "LUNCH" ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">شرکت‌کنندگان</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {request.participants.map((item) => (
                        <span
                          key={item.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-sm"
                        >
                          {item.user.name}
                        </span>
                      ))}
                    </dd>
                  </div>
                ) : null}
                {request.description ? (
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-slate-500">توضیحات</dt>
                    <dd className="mt-2 text-sm leading-7 whitespace-pre-wrap">
                      {request.description}
                    </dd>
                  </div>
                ) : null}
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>مدارک بایگانی‌شده</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {request.attachments.map((attachment) => (
                <a
                  key={attachment.id}
                  href={`/api/v1/invoice-requests/${request.id}/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="focus-ring flex items-center justify-between rounded-xl border p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="text-sm font-semibold">
                      {attachmentLabels[attachment.type]}
                    </p>
                    <p className="mt-1 max-w-56 truncate text-xs text-slate-500">
                      {attachment.originalName}
                    </p>
                  </div>
                  <Download className="size-4 text-orange-600" />
                </a>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          {bank ? (
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات پرداخت گیرنده</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">نام</p>
                  <p className="mt-1 font-semibold">{bank.name}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">شماره کارت</p>
                  <p className="numeric mt-1 select-all" dir="ltr">
                    {bank.cardNumber ?? "ثبت نشده"}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">شماره شبا</p>
                  <p className="numeric mt-1 break-all select-all" dir="ltr">
                    {bank.iban ?? "ثبت نشده"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          {request.payment ? (
            <Card>
              <CardHeader>
                <CardTitle>پرداخت</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div>
                  <p className="text-xs text-slate-500">مبلغ</p>
                  <p className="mt-1 font-bold">
                    {formatToman(request.payment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">تاریخ پرداخت</p>
                  <p className="numeric mt-1">
                    {formatJalaliDate(request.payment.paidOn)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">شماره پیگیری</p>
                  <p className="numeric mt-1 select-all" dir="ltr">
                    {request.payment.trackingCode}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
          <Card>
            <CardHeader>
              <CardTitle>تاریخچه وضعیت</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-5 border-r-2 border-slate-100 pr-5">
                {request.statusHistory.map((item) => (
                  <li key={item.id} className="relative">
                    <span className="absolute top-1 -right-[27px] size-3 rounded-full border-2 border-white bg-orange-600" />
                    <StatusBadge status={item.toStatus} />
                    <p className="mt-2 text-xs text-slate-500">
                      {item.changedBy.name} ·{" "}
                      {formatJalaliDateTime(item.changedAt)}
                    </p>
                    {item.reason ? (
                      <p className="mt-1 text-xs leading-6 text-slate-600">
                        {item.reason}
                      </p>
                    ) : null}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
