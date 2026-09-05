"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Values {
  currentPassword: string;
  newPassword: string;
  confirmation: string;
}

export function PasswordForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>();
  return (
    <form
      className="space-y-5"
      onSubmit={handleSubmit(async (values) => {
        if (values.newPassword !== values.confirmation) {
          toast.error("تکرار رمز عبور با رمز جدید یکسان نیست.");
          return;
        }
        const response = await fetch("/api/v1/me/password", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            currentPassword: values.currentPassword,
            newPassword: values.newPassword,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          toast.error(payload.error?.message ?? "تغییر رمز انجام نشد.");
          return;
        }
        toast.success("رمز عبور تغییر کرد و نشست‌های دیگر بسته شدند.");
        reset();
      })}
    >
      <div>
        <Label htmlFor="currentPassword">رمز عبور فعلی</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          {...register("currentPassword", {
            required: "رمز فعلی را وارد کنید.",
          })}
        />
        {errors.currentPassword ? (
          <p className="mt-1 text-xs text-red-700">
            {errors.currentPassword.message}
          </p>
        ) : null}
      </div>
      <div>
        <Label htmlFor="newPassword">رمز عبور جدید</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          {...register("newPassword", { required: true, minLength: 12 })}
        />
        <p className="mt-1 text-xs text-slate-500">حداقل ۱۲ نویسه</p>
      </div>
      <div>
        <Label htmlFor="confirmation">تکرار رمز عبور جدید</Label>
        <Input
          id="confirmation"
          type="password"
          autoComplete="new-password"
          {...register("confirmation", { required: true })}
        />
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <LoaderCircle className="size-4 animate-spin" />
        ) : (
          <Save className="size-4" />
        )}
        تغییر رمز عبور
      </Button>
    </form>
  );
}
