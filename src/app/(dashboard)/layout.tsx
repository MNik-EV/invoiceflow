import { AppShell } from "@/components/layout/app-shell";
import { requirePageIdentity } from "@/modules/identity/application/session";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = await requirePageIdentity();
  return <AppShell identity={identity}>{children}</AppShell>;
}
