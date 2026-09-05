export default function RootLoading() {
  return (
    <main
      className="mx-auto flex min-h-screen max-w-7xl items-center justify-center p-6"
      aria-busy="true"
    >
      <div className="flex items-center gap-3 text-slate-600">
        <span className="size-5 animate-spin rounded-full border-2 border-orange-600 border-t-transparent" />
        <span>در حال بارگذاری…</span>
      </div>
    </main>
  );
}
