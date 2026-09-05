import type { Role } from "@prisma/client";
import {
  BarChart3,
  ClipboardList,
  CreditCard,
  FilePlus2,
  History,
  LayoutDashboard,
  LockKeyhole,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import Image from "next/image";

import { LogoutButton } from "@/components/logout-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { isFinanceAdmin } from "@/modules/identity/domain/permissions";

const userNavigation = [
  { href: "/dashboard", label: "پیشخوان", icon: LayoutDashboard },
  { href: "/invoices/new", label: "ثبت فاکتور", icon: FilePlus2 },
  { href: "/invoices/history", label: "سوابق من", icon: History },
  { href: "/profile/bank", label: "اطلاعات بانکی", icon: CreditCard },
  { href: "/profile/security", label: "امنیت حساب", icon: LockKeyhole },
];

export function AppShell({
  children,
  identity,
}: {
  children: React.ReactNode;
  identity: { name: string; role: Role };
}) {
  const adminNavigation = isFinanceAdmin(identity.role)
    ? [
        { href: "/admin", label: "مدیریت فاکتورها", icon: ShieldCheck },
        { href: "/admin/reports", label: "گزارش‌ها", icon: BarChart3 },
        ...(identity.role === "SUPER_ADMIN"
          ? [
              { href: "/admin/users", label: "کاربران", icon: Users },
              { href: "/admin/settings", label: "تنظیمات", icon: Settings },
              {
                href: "/admin/audit",
                label: "رویدادهای ممیزی",
                icon: ClipboardList,
              },
            ]
          : []),
      ]
    : [];
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="border-b bg-white lg:sticky lg:top-0 lg:h-screen lg:border-b-0 lg:border-l">
        <div className="flex h-16 items-center justify-between px-5 lg:h-20 lg:border-b">
          <Link href="/dashboard" className="flex items-center gap-3">
            <Image
              src="/logo.svg"
              width={42}
              height={42}
              alt="نشان InvoiceFlow"
              priority
            />
            <span>
              <span className="block font-black text-slate-900">
                مدیریت فاکتور
              </span>
              <span className="block text-[11px] text-slate-500">
                InvoiceFlow
              </span>
            </span>
          </Link>
          <div className="flex items-center gap-1 lg:hidden">
            <ThemeToggle />
            <LogoutButton />
          </div>
        </div>
        <nav
          className="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:px-4 lg:py-5"
          aria-label="منوی اصلی"
        >
          {[...userNavigation, ...adminNavigation].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="focus-ring flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-orange-50 hover:text-orange-800 dark:hover:bg-orange-950/30"
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute right-0 bottom-0 left-0 hidden border-t bg-white p-4 lg:block">
          <div className="mb-3 px-2">
            <p className="truncate text-sm font-semibold">{identity.name}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {identity.role === "SUPER_ADMIN"
                ? "مدیر کل"
                : identity.role === "FINANCE_ADMIN"
                  ? "مدیر مالی"
                  : "کاربر"}
            </p>
          </div>
          <LogoutButton />
        </div>
      </aside>
      <main className="min-w-0">
        <header className="hidden h-20 items-center justify-between border-b bg-white/80 px-8 backdrop-blur lg:flex">
          <p className="text-sm text-slate-500">
            ثبت، بررسی و بایگانی امن فاکتورها
          </p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <p className="text-sm font-semibold">{identity.name}</p>
          </div>
        </header>
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
