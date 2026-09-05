"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="w-full max-w-lg rounded-2xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-bold">مشکلی پیش آمد</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          عملیات با خطا روبه‌رو شد. دوباره تلاش کنید و در صورت تکرار، کد پیگیری
          را برای مدیر سامانه بفرستید.
        </p>
        {error.digest ? (
          <p className="numeric mt-2 text-xs text-slate-500">{error.digest}</p>
        ) : null}
        <button
          className="focus-ring mt-6 rounded-xl bg-orange-600 px-5 py-2.5 text-white"
          onClick={reset}
        >
          تلاش دوباره
        </button>
      </section>
    </main>
  );
}
