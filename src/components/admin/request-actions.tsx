"use client";

import { Check, CreditCard, LoaderCircle, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { JalaliDatePicker } from "@/components/forms/jalali-date-picker";

async function postAction(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok)
    throw new Error(payload.error?.message ?? "عملیات انجام نشد.");
  return payload;
}

export function RequestActions({
  requestId,
  version,
  status,
  amount,
  defaultPaymentDate,
  category,
}: {
  requestId: string;
  version: number;
  status: string;
  amount: string | null;
  defaultPaymentDate: string;
  category: "LUNCH" | "LAB_PURCHASE";
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [paymentDate, setPaymentDate] = useState(defaultPaymentDate);

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    try {
      await action();
      toast.success(success);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "عملیات انجام نشد.");
    } finally {
      setPending(false);
    }
  }

  if (status === "PENDING_REVIEW") {
    return (
      <div className="flex flex-wrap gap-2">
        <Dialog>
          <DialogTrigger asChild>
            <Button disabled={pending}>
              <Check className="size-4" />
              تأیید درخواست
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>تأیید فاکتور</DialogTitle>
            <DialogDescription>
              {category === "LUNCH"
                ? "مبلغ بازپرداخت بر اساس سهمیه فعلی و تعداد شرکت‌کنندگان محاسبه و ثابت می‌شود."
                : "مبلغ فاکتور خرید تخصصی پس از تأیید برای پرداخت ثابت می‌شود."}
            </DialogDescription>
            <Button
              className="mt-5 w-full"
              disabled={pending}
              onClick={() =>
                run(
                  () =>
                    postAction(
                      `/api/v1/admin/invoice-requests/${requestId}/approve`,
                      { version },
                    ),
                  "درخواست تأیید شد.",
                )
              }
            >
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              تأیید نهایی
            </Button>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="danger" disabled={pending}>
              <XCircle className="size-4" />
              رد درخواست
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogTitle>رد درخواست</DialogTitle>
            <DialogDescription>
              دلیل رد برای کاربر نمایش داده می‌شود و می‌تواند درخواست را اصلاح
              کند.
            </DialogDescription>
            <form
              className="mt-5 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                const reason = new FormData(event.currentTarget).get("reason");
                run(
                  () =>
                    postAction(
                      `/api/v1/admin/invoice-requests/${requestId}/reject`,
                      { version, reason },
                    ),
                  "درخواست رد شد.",
                );
              }}
            >
              <div>
                <Label htmlFor="reason">دلیل رد</Label>
                <Textarea
                  id="reason"
                  name="reason"
                  required
                  minLength={3}
                  maxLength={1000}
                />
              </div>
              <Button
                type="submit"
                variant="danger"
                className="w-full"
                disabled={pending}
              >
                ثبت رد درخواست
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  if (status === "APPROVED" && amount) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button disabled={pending}>
            <CreditCard className="size-4" />
            ثبت پرداخت
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogTitle>ثبت پرداخت بازپرداخت</DialogTitle>
          <DialogDescription>
            پس از ثبت، درخواست قفل و غیرقابل‌ویرایش می‌شود.
          </DialogDescription>
          <form
            className="mt-5 space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              run(
                () =>
                  postAction(
                    `/api/v1/admin/invoice-requests/${requestId}/payment`,
                    {
                      version,
                      amount: form.get("amount"),
                      paidOn: paymentDate,
                      trackingCode: form.get("trackingCode"),
                    },
                  ),
                "پرداخت ثبت شد.",
              );
            }}
          >
            <div>
              <Label htmlFor="amount">مبلغ پرداخت (تومان)</Label>
              <Input
                id="amount"
                name="amount"
                dir="ltr"
                readOnly
                value={amount}
              />
            </div>
            <div>
              <Label htmlFor="paidOn">تاریخ پرداخت (شمسی)</Label>
              <JalaliDatePicker
                id="paidOn"
                name="paidOn"
                value={paymentDate}
                onChange={setPaymentDate}
              />
            </div>
            <div>
              <Label htmlFor="trackingCode">شماره پیگیری</Label>
              <Input
                id="trackingCode"
                name="trackingCode"
                dir="ltr"
                required
                maxLength={120}
              />
            </div>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? (
                <LoaderCircle className="size-4 animate-spin" />
              ) : null}
              ثبت پرداخت و قفل درخواست
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }
  return null;
}
