import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <section className="rounded-2xl border bg-white p-8 text-center shadow-sm">
        <p className="numeric text-5xl font-black text-orange-600">۴۰۴</p>
        <h1 className="mt-4 text-xl font-bold">صفحه پیدا نشد</h1>
        <Link
          className="focus-ring mt-6 inline-block rounded-xl bg-orange-600 px-5 py-2.5 text-white"
          href="/dashboard"
        >
          بازگشت به پیشخوان
        </Link>
      </section>
    </main>
  );
}
