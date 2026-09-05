"use client";

import type { Role } from "@prisma/client";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface UserItem {
  id: string;
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: Role;
  isActive: boolean;
}

const roleLabels: Record<Role, string> = {
  USER: "کاربر",
  FINANCE_ADMIN: "مدیر مالی",
  SUPER_ADMIN: "مدیر کل",
};

function UserFields({ user }: { user?: UserItem }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-xs font-semibold">
        نام و نام خانوادگی
        <Input
          name="name"
          defaultValue={user?.name}
          required
          minLength={2}
          className="mt-2"
        />
      </label>
      <label className="text-xs font-semibold">
        نام کاربری
        <Input
          name="username"
          dir="ltr"
          defaultValue={user?.username}
          required
          pattern="[A-Za-z0-9._-]{3,80}"
          className="mt-2"
        />
      </label>
      <label className="text-xs font-semibold">
        ایمیل
        <Input
          name="email"
          type="email"
          dir="ltr"
          defaultValue={user?.email ?? ""}
          className="mt-2"
        />
      </label>
      <label className="text-xs font-semibold">
        تلفن
        <Input
          name="phone"
          dir="ltr"
          defaultValue={user?.phone ?? ""}
          className="mt-2"
        />
      </label>
      <label className="text-xs font-semibold">
        نقش
        <select
          name="role"
          defaultValue={user?.role ?? "USER"}
          className="focus-ring mt-2 block h-11 w-full rounded-xl border bg-white px-3"
        >
          {Object.entries(roleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {user ? (
        <label className="mt-6 flex items-center gap-2 text-sm">
          <input
            name="isActive"
            type="checkbox"
            defaultChecked={user.isActive}
            className="size-4 accent-orange-600"
          />
          حساب فعال است
        </label>
      ) : (
        <label className="text-xs font-semibold">
          رمز عبور اولیه
          <Input
            name="password"
            type="password"
            dir="ltr"
            minLength={12}
            required
            className="mt-2"
          />
        </label>
      )}
    </div>
  );
}

function formPayload(form: HTMLFormElement, includePassword: boolean) {
  const data = new FormData(form);
  return {
    name: String(data.get("name") ?? ""),
    username: String(data.get("username") ?? ""),
    email: String(data.get("email") ?? "").trim() || null,
    phone: String(data.get("phone") ?? "").trim() || null,
    role: String(data.get("role")) as Role,
    ...(includePassword
      ? { password: String(data.get("password") ?? "") }
      : { isActive: data.get("isActive") === "on" }),
  };
}

export function UsersManager({ users }: { users: UserItem[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  async function submit(
    url: string,
    method: string,
    body: unknown,
    key: string,
  ) {
    setPending(key);
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = await response.json();
    setPending(null);
    if (!response.ok) {
      toast.error(payload.error?.message ?? "عملیات انجام نشد.");
      return false;
    }
    toast.success("اطلاعات کاربر ذخیره شد.");
    router.refresh();
    return true;
  }
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="size-4" />
              کاربر جدید
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogTitle>ایجاد کاربر</DialogTitle>
            <DialogDescription>
              حساب محلی جدید برای یکی از کارکنان ایجاد کنید.
            </DialogDescription>
            <form
              className="mt-5 space-y-5"
              onSubmit={(event) => {
                event.preventDefault();
                submit(
                  "/api/v1/admin/users",
                  "POST",
                  formPayload(event.currentTarget, true),
                  "new",
                );
              }}
            >
              <UserFields />
              <Button
                type="submit"
                className="w-full"
                disabled={pending === "new"}
              >
                {pending === "new" ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : null}
                ایجاد حساب
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="space-y-3">
        {users.map((user) => (
          <details
            key={user.id}
            className="rounded-2xl border bg-white shadow-sm"
          >
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5">
              <div>
                <p className="font-bold">{user.name}</p>
                <p className="numeric mt-1 text-xs text-slate-500" dir="ltr">
                  @{user.username} · {user.email ?? "بدون ایمیل"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs ${user.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}
                >
                  {user.isActive ? "فعال" : "غیرفعال"}
                </span>
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs text-orange-800">
                  {roleLabels[user.role]}
                </span>
              </div>
            </summary>
            <form
              className="border-t p-5"
              onSubmit={(event) => {
                event.preventDefault();
                submit(
                  `/api/v1/admin/users/${user.id}`,
                  "PATCH",
                  formPayload(event.currentTarget, false),
                  user.id,
                );
              }}
            >
              <UserFields user={user} />
              <Button
                type="submit"
                className="mt-5"
                disabled={pending === user.id}
              >
                {pending === user.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Save className="size-4" />
                )}
                ذخیره تغییرات
              </Button>
            </form>
          </details>
        ))}
      </div>
    </div>
  );
}
