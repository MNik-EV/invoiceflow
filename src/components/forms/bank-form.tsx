"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CreditCard, Landmark, LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  cardNumber: z.string().min(16, "شماره کارت را کامل وارد کنید.").max(30),
  iban: z.string().min(24, "شماره شبا را کامل وارد کنید.").max(40),
});

type Values = z.infer<typeof schema>;

export function BankForm({ initialValues }: { initialValues: Values }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: initialValues,
  });
  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        const response = await fetch("/api/v1/me/bank-account", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });
        const payload = await response.json();
        if (!response.ok) {
          toast.error(payload.error?.message ?? "ذخیره انجام نشد.");
          return;
        }
        toast.success("اطلاعات بانکی با موفقیت ذخیره شد.");
      })}
    >
      <div>
        <Label htmlFor="cardNumber">شماره کارت بانکی</Label>
        <div className="relative">
          <CreditCard className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="cardNumber"
            dir="ltr"
            inputMode="numeric"
            autoComplete="off"
            className="pr-10"
            placeholder="6037-xxxx-xxxx-xxxx"
            {...register("cardNumber")}
          />
        </div>
        {errors.cardNumber ? (
          <p className="mt-1.5 text-xs text-red-700">
            {errors.cardNumber.message}
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="iban">شماره شبا</Label>
        <div className="relative">
          <Landmark className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            id="iban"
            dir="ltr"
            autoComplete="off"
            className="pr-10"
            placeholder="IRxx xxxx xxxx xxxx xxxx xxxx xx"
            {...register("iban")}
          />
        </div>
        {errors.iban ? (
          <p className="mt-1.5 text-xs text-red-700">{errors.iban.message}</p>
        ) : null}
      </div>
      <div className="rounded-xl bg-slate-50 p-4 text-xs leading-6 text-slate-600">
        اطلاعات بانکی به‌صورت رمزگذاری‌شده نگهداری می‌شود و فقط مدیران مسئول
        پرداخت به آن دسترسی دارند.
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        ذخیره اطلاعات
      </Button>
    </form>
  );
}
