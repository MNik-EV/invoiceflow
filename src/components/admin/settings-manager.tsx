"use client";

import { LoaderCircle, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SettingItem {
  id: string;
  key: string;
  value: string;
  version: number;
  updatedAt: string;
  revisions: Array<{
    id: string;
    oldValue: string | null;
    newValue: string;
    changedAt: string;
    changedBy: { name: string } | null;
  }>;
}

const labels: Record<string, string> = {
  "lunch.allowance_toman": "سهمیه هر نفر برای ناهار",
  "invoice.max_amount_toman": "سقف مجاز مبلغ همه فاکتورها",
};

export function SettingsManager({ settings }: { settings: SettingItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  return (
    <div className="space-y-5">
      {settings.map((setting) => (
        <section
          key={setting.id}
          className="rounded-2xl border bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-bold">
                {labels[setting.key] ?? setting.key}
              </h2>
              <p className="numeric mt-1 text-xs text-slate-400" dir="ltr">
                {setting.key}
              </p>
            </div>
            <form
              className="flex items-end gap-2"
              onSubmit={async (event) => {
                event.preventDefault();
                setPending(setting.id);
                const value = String(
                  new FormData(event.currentTarget).get("value") ?? "",
                ).replace(/[,٬\s]/g, "");
                const response = await fetch(
                  `/api/v1/admin/settings/${encodeURIComponent(setting.key)}`,
                  {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ value, version: setting.version }),
                  },
                );
                const payload = await response.json();
                setPending(null);
                if (!response.ok) {
                  toast.error(payload.error?.message ?? "ذخیره انجام نشد.");
                  return;
                }
                toast.success("تنظیم با موفقیت به‌روزرسانی شد.");
                router.refresh();
              }}
            >
              <label className="text-xs font-semibold text-slate-600">
                مبلغ (تومان)
                <Input
                  name="value"
                  dir="ltr"
                  inputMode="numeric"
                  defaultValue={setting.value}
                  className="mt-2 w-48"
                />
              </label>
              <Button type="submit" disabled={pending === setting.id}>
                {pending === setting.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                ذخیره
              </Button>
            </form>
          </div>
          {setting.revisions.length ? (
            <details className="mt-5 border-t pt-4">
              <summary className="cursor-pointer text-sm font-semibold text-slate-600">
                تاریخچه تغییرات
              </summary>
              <div className="mt-3 space-y-2">
                {setting.revisions.map((revision) => (
                  <div
                    key={revision.id}
                    className="flex flex-wrap justify-between gap-2 rounded-lg bg-slate-50 p-3 text-xs"
                  >
                    <span>{revision.changedBy?.name ?? "سیستم"}</span>
                    <span dir="ltr">
                      {revision.oldValue ?? "—"} ← {revision.newValue}
                    </span>
                    <time>
                      {new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(revision.changedAt))}
                    </time>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
        </section>
      ))}
    </div>
  );
}
