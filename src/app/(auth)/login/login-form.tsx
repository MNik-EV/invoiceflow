"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const schema = z.object({
  username: z.string().trim().min(1, "نام کاربری را وارد کنید."),
  password: z.string().min(1, "رمز عبور را وارد کنید."),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm({
  localEnabled,
  oidcEnabled,
  oidcDisplayName,
}: {
  localEnabled: boolean;
  oidcEnabled: boolean;
  oidcDisplayName: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  useEffect(() => {
    const error = searchParams.get("ssoError");
    if (error) toast.error(error);
  }, [searchParams]);

  const next = searchParams.get("next");
  const oidcHref = `/api/v1/auth/oidc/start${next?.startsWith("/") && !next.startsWith("//") ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="mt-8 space-y-5">
      {oidcEnabled ? (
        <Button asChild size="lg" className="w-full">
          <a href={oidcHref}>
            <Building2 className="size-4" />
            {oidcDisplayName}
          </a>
        </Button>
      ) : null}
      {oidcEnabled && localEnabled ? (
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
          یا ورود محلی
          <span className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        </div>
      ) : null}
      {localEnabled ? (
        <form
          action="/api/v1/auth/login"
          method="post"
          className="space-y-5"
          onSubmit={handleSubmit(async (values) => {
            const response = await fetch("/api/v1/auth/login", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(values),
            });
            const payload = await response.json();
            if (!response.ok) {
              toast.error(payload.error?.message ?? "ورود انجام نشد.");
              return;
            }
            toast.success("با موفقیت وارد شدید.");
            router.replace(
              next?.startsWith("/") && !next.startsWith("//")
                ? next
                : "/dashboard",
            );
            router.refresh();
          })}
        >
          <div>
            <Label htmlFor="username">نام کاربری</Label>
            <Input
              id="username"
              autoComplete="username"
              autoFocus
              {...register("username")}
            />
            {errors.username ? (
              <p className="mt-1.5 text-xs text-red-700">
                {errors.username.message}
              </p>
            ) : null}
          </div>
          <div>
            <Label htmlFor="password">رمز عبور</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                className="pl-11"
                {...register("password")}
              />
              <button
                type="button"
                className="focus-ring absolute top-1/2 left-2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "پنهان‌کردن رمز" : "نمایش رمز"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
            {errors.password ? (
              <p className="mt-1.5 text-xs text-red-700">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <LogIn className="size-4" />
            )}
            ورود به سامانه
          </Button>
        </form>
      ) : null}
    </div>
  );
}
