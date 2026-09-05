"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { InvoiceCategory, LabPurchaseCategory } from "@prisma/client";
import {
  Calculator,
  FileCheck2,
  LoaderCircle,
  Search,
  UploadCloud,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { JalaliDatePicker } from "@/components/forms/jalali-date-picker";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatToman, normalizeDigits } from "@/lib/i18n/numbers";

const schema = z.object({
  invoiceDate: z
    .string()
    .regex(
      /^[۰-۹٠-٩0-9]{4}[/-][۰-۹٠-٩0-9]{1,2}[/-][۰-۹٠-٩0-9]{1,2}$/,
      "تاریخ را به شکل ۱۴۰۵/۰۶/۰۱ وارد کنید.",
    ),
  title: z.string().max(200).optional(),
  vendorName: z.string().max(200).optional(),
  purchaseCategory: z.string().optional(),
  participantIds: z.array(z.string()),
  invoiceAmount: z.string().min(1, "مبلغ فاکتور را وارد کنید."),
  description: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

interface Participant {
  id: string;
  name: string;
  username: string;
}

interface InitialValues extends FormValues {
  version: number;
}

const purchaseCategories: Array<{
  value: LabPurchaseCategory;
  label: string;
}> = [
  { value: "IC", label: "آی‌سی" },
  { value: "MOSFET", label: "ماسفت" },
  { value: "MODULE", label: "ماژول" },
  { value: "SENSOR", label: "سنسور" },
  { value: "PCB", label: "برد و PCB" },
  { value: "TOOL", label: "ابزار" },
  { value: "OTHER", label: "سایر" },
];

function FileUpload({
  name,
  label,
  required,
  imagesOnly = false,
}: {
  name: string;
  label: string;
  required: boolean;
  imagesOnly?: boolean;
}) {
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <label className="focus-within:ring-primary/40 hover:border-primary/50 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed bg-slate-50 p-4 text-center transition focus-within:ring-2 dark:bg-slate-900/40">
        <UploadCloud className="text-primary mb-2 size-7" />
        <span className="text-sm font-semibold">انتخاب یا رهاکردن فایل</span>
        <span className="mt-1 text-xs text-slate-500">
          {imagesOnly ? "JPG، PNG یا WebP" : "JPG، PNG، WebP یا PDF"}
        </span>
        <input
          id={name}
          name={name}
          type="file"
          required={required}
          accept={
            imagesOnly
              ? "image/jpeg,image/png,image/webp"
              : "image/jpeg,image/png,image/webp,application/pdf"
          }
          className="mt-3 block max-w-full text-xs"
        />
      </label>
    </div>
  );
}

export function InvoiceRequestForm({
  category,
  participants,
  allowance,
  defaultDate,
  requestId,
  initialValues,
}: {
  category: InvoiceCategory;
  participants: Participant[];
  allowance: string;
  defaultDate: string;
  requestId?: string;
  initialValues?: InitialValues;
}) {
  const router = useRouter();
  const isLunch = category === "LUNCH";
  const [search, setSearch] = useState("");
  const [duplicates, setDuplicates] = useState(0);
  const {
    register,
    handleSubmit,
    getValues,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? {
      invoiceDate: defaultDate,
      title: "",
      vendorName: "",
      purchaseCategory: isLunch ? "" : "OTHER",
      participantIds: [],
      invoiceAmount: "",
      description: "",
    },
  });
  const selected = useWatch({ control, name: "participantIds" }) ?? [];
  const amount = useWatch({ control, name: "invoiceAmount" });
  const preview = useMemo(() => {
    try {
      const normalized = normalizeDigits(amount || "").replace(/[,٬\s]/g, "");
      if (!/^\d+$/.test(normalized)) return null;
      const invoice = BigInt(normalized);
      if (!isLunch) return invoice;
      if (!selected.length) return null;
      const ceiling = BigInt(allowance) * BigInt(selected.length);
      return invoice < ceiling ? invoice : ceiling;
    } catch {
      return null;
    }
  }, [allowance, amount, isLunch, selected.length]);
  const visibleParticipants = participants.filter((item) =>
    `${item.name} ${item.username}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  async function send(values: FormValues, duplicateConfirmed: boolean) {
    if (!isLunch && !values.title?.trim()) {
      toast.error("عنوان خرید را وارد کنید.");
      return;
    }
    if (isLunch && !values.participantIds.length) {
      toast.error("حداقل یک شرکت‌کننده انتخاب کنید.");
      return;
    }
    const form = new FormData();
    form.set("category", category);
    form.set("invoiceDate", values.invoiceDate);
    form.set("title", isLunch ? "" : (values.title ?? ""));
    form.set("vendorName", values.vendorName ?? "");
    form.set(
      "purchaseCategory",
      isLunch ? "" : (values.purchaseCategory ?? "OTHER"),
    );
    form.set(
      "participantIds",
      JSON.stringify(isLunch ? values.participantIds : []),
    );
    form.set("invoiceAmount", values.invoiceAmount);
    form.set("description", values.description ?? "");
    form.set("duplicateConfirmed", String(duplicateConfirmed));
    if (initialValues) form.set("version", String(initialValues.version));
    const formElement =
      document.querySelector<HTMLFormElement>("#invoice-form");
    for (const key of [
      "invoice",
      "paymentProof",
      "foodImage",
      "supportingDocument",
    ] as const) {
      const input = formElement?.elements.namedItem(
        key,
      ) as HTMLInputElement | null;
      if (input?.files?.[0]) form.set(key, input.files[0]);
    }
    const endpoint = requestId
      ? `/api/v1/invoice-requests/${requestId}`
      : "/api/v1/invoice-requests";
    const response = await fetch(endpoint, {
      method: requestId ? "PATCH" : "POST",
      body: form,
    });
    const payload = await response.json();
    if (!response.ok) {
      if (payload.error?.code === "DUPLICATE_CONFIRMATION_REQUIRED") {
        setDuplicates(1);
        return;
      }
      throw new Error(payload.error?.message ?? "ثبت فاکتور انجام نشد.");
    }
    toast.success(requestId ? "درخواست دوباره ارسال شد." : "فاکتور ثبت شد.");
    router.push(`/invoices/${payload.data.id}`);
    router.refresh();
  }

  const submit = handleSubmit(async (values) => {
    try {
      if (!requestId && !duplicates) {
        const check = await fetch("/api/v1/invoice-requests/duplicate-check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category,
            invoiceDate: values.invoiceDate,
            title: isLunch ? null : values.title,
            vendorName: values.vendorName,
            purchaseCategory: isLunch ? null : values.purchaseCategory,
            participantIds: isLunch ? values.participantIds : [],
            invoiceAmount: values.invoiceAmount,
            description: values.description,
            duplicateConfirmed: false,
          }),
        });
        const payload = await check.json();
        if (check.ok && payload.data.candidates.length) {
          setDuplicates(payload.data.candidates.length);
          return;
        }
      }
      await send(values, duplicates > 0);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ثبت فاکتور انجام نشد.",
      );
    }
  });
  async function confirmDuplicate() {
    try {
      await send(getValues(), true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "ثبت فاکتور انجام نشد.",
      );
    }
  }

  return (
    <form id="invoice-form" onSubmit={submit} className="space-y-5">
      <Card>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {!isLunch ? (
            <>
              <div>
                <Label htmlFor="title">چه چیزی خریدید؟</Label>
                <Input
                  id="title"
                  placeholder="مثلاً ۲۰ عدد ماسفت IRF540"
                  {...register("title")}
                />
              </div>
              <div>
                <Label htmlFor="purchaseCategory">دسته خرید</Label>
                <select
                  id="purchaseCategory"
                  className="focus-ring h-11 w-full rounded-xl border bg-white px-3 text-sm dark:bg-slate-900"
                  {...register("purchaseCategory")}
                >
                  {purchaseCategories.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : null}
          <div>
            <Label htmlFor="invoiceDate">
              {isLunch ? "تاریخ ناهار" : "تاریخ خرید"} (شمسی)
            </Label>
            <Controller
              name="invoiceDate"
              control={control}
              render={({ field }) => (
                <JalaliDatePicker
                  id="invoiceDate"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
            {errors.invoiceDate ? (
              <p className="mt-1 text-xs text-red-700">
                {errors.invoiceDate.message}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="invoiceAmount">مبلغ فاکتور (تومان)</Label>
            <Input
              id="invoiceAmount"
              inputMode="numeric"
              dir="ltr"
              placeholder="2,000,000"
              {...register("invoiceAmount")}
            />
            {errors.invoiceAmount ? (
              <p className="mt-1 text-xs text-red-700">
                {errors.invoiceAmount.message}
              </p>
            ) : null}
          </div>
          <div className={isLunch ? "md:col-span-2" : undefined}>
            <Label htmlFor="vendorName">
              {isLunch ? "نام رستوران" : "فروشنده"} (اختیاری)
            </Label>
            <Input
              id="vendorName"
              placeholder={
                isLunch ? "نام رستوران" : "نام فروشگاه یا تأمین‌کننده"
              }
              {...register("vendorName")}
            />
          </div>
          {isLunch ? (
            <div className="md:col-span-2">
              <div className="mb-2 flex items-end justify-between gap-3">
                <div>
                  <Label>افراد حاضر</Label>
                  <p className="mt-1 text-xs text-slate-500">
                    فقط افرادی را انتخاب کنید که در این سفارش بوده‌اند.
                  </p>
                </div>
                <div className="relative w-56 max-w-full">
                  <Search className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="جست‌وجوی همکار…"
                    className="h-9 pr-9"
                  />
                </div>
              </div>
              <div className="grid max-h-52 gap-2 overflow-y-auto rounded-2xl border bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3 dark:bg-slate-900/40">
                {visibleParticipants.map((participant) => (
                  <label
                    key={participant.id}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border bg-white p-3 text-sm transition has-checked:border-orange-400 has-checked:bg-orange-50 dark:bg-slate-900 dark:has-checked:bg-orange-950/30"
                  >
                    <input
                      type="checkbox"
                      value={participant.id}
                      className="size-4 accent-orange-600"
                      {...register("participantIds")}
                    />
                    <span className="font-semibold">{participant.name}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}
          <div className="md:col-span-2">
            <Label htmlFor="description">توضیحات (اختیاری)</Label>
            <Textarea
              id="description"
              className="min-h-20"
              placeholder={
                isLunch
                  ? "نکته‌ای درباره سفارش دارید؟"
                  : "کاربرد قطعه، پروژه مرتبط یا توضیحات تکمیلی"
              }
              {...register("description")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <div className="mb-5 flex items-center gap-3">
            <span className="bg-primary/10 text-primary grid size-10 place-items-center rounded-xl">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <h2 className="font-bold">مدارک خرید</h2>
              <p className="text-xs text-slate-500">
                دو فایل اول برای ثبت جدید الزامی‌اند.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <FileUpload name="invoice" label="فاکتور" required={!requestId} />
            <FileUpload
              name="paymentProof"
              label="رسید پرداخت"
              required={!requestId}
            />
            {isLunch ? (
              <FileUpload
                name="foodImage"
                label="تصویر غذا (اختیاری)"
                required={false}
                imagesOnly
              />
            ) : (
              <FileUpload
                name="supportingDocument"
                label="مدرک تکمیلی (اختیاری)"
                required={false}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {duplicates ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between dark:bg-amber-950/30">
          <div>
            <p className="font-bold">فاکتور مشابه پیدا شد</p>
            <p className="mt-1">اگر این خرید جداگانه است، ثبت آن را تأیید کنید.</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            disabled={isSubmitting}
            onClick={confirmDuplicate}
          >
            ثبت به‌عنوان فاکتور جداگانه
          </Button>
        </div>
      ) : null}

      <div className="border-primary/20 bg-primary/5 flex flex-col gap-4 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="text-primary size-5" />
          <div>
            <p className="text-xs text-slate-500">مبلغ قابل بررسی</p>
            <p className="mt-1 text-lg font-black">
              {preview === null ? "—" : formatToman(preview)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.back()}
          >
            انصراف
          </Button>
          <Button type="submit" size="lg" disabled={isSubmitting}>
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : null}
            {requestId ? "اصلاح و ارسال" : "ثبت فاکتور"}
          </Button>
        </div>
      </div>
    </form>
  );
}
