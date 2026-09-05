import { UsersManager } from "@/components/admin/users-manager";
import { PageHeader } from "@/components/page-header";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { listUsers } from "@/modules/users/application/users";

export const metadata = { title: "مدیریت کاربران" };

export default async function UsersPage() {
  const identity = await requirePageIdentity();
  const users = await listUsers(identity);
  return (
    <>
      <PageHeader
        title="مدیریت کاربران"
        description="کاربران، نقش‌ها و دسترسی مدیران سامانه را مدیریت کنید."
      />
      <UsersManager users={users} />
    </>
  );
}
