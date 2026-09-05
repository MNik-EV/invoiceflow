import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import Image from "next/image";

import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { WebglAurora } from "@/components/effects/webgl-aurora";
import { LoginForm } from "./login-form";
import { getEnv } from "@/lib/env";
import {
  isLocalLoginEnabled,
  isOidcEnabled,
} from "@/modules/identity/infrastructure/oidc";

export const metadata = { title: "ورود" };
export const dynamic = "force-dynamic";

export default function LoginPage() {
  const env = getEnv();
  const oidcEnabled = isOidcEnabled();
  const localEnabled = isLocalLoginEnabled();
  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden p-4 sm:p-8">
      <WebglAurora />
      <div className="pointer-events-none absolute -top-32 -right-32 size-96 rounded-full bg-orange-300/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-24 size-96 rounded-full bg-amber-300/10 blur-3xl" />
      <ThemeToggle className="absolute top-4 left-4 border bg-white/80 shadow-sm backdrop-blur" />
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Image
            className="mx-auto drop-shadow-xl"
            src="/logo.svg"
            width={72}
            height={72}
            alt="نشان InvoiceFlow"
            priority
          />
          <h1 className="mt-5 text-2xl font-black">سامانه مدیریت فاکتور</h1>
          <p className="mt-2 text-sm text-slate-500">
            ثبت ساده، بررسی شفاف و بایگانی امن
          </p>
        </div>
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <ShieldCheck className="size-5 text-orange-600" />
              اطلاعات ورود شما به‌صورت امن بررسی می‌شود.
            </div>
            <Suspense
              fallback={
                <p className="mt-8 text-center text-sm text-slate-500">
                  در حال آماده‌سازی…
                </p>
              }
            >
              <LoginForm
                localEnabled={localEnabled}
                oidcEnabled={oidcEnabled}
                oidcDisplayName={env.OIDC_DISPLAY_NAME}
              />
            </Suspense>
          </CardContent>
        </Card>
        <p className="mt-5 text-center text-xs text-slate-400">
          نسخهٔ متن‌باز و قابل استقرار در زیرساخت سازمان شما
        </p>
      </div>
    </main>
  );
}
