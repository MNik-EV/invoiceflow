import { SettingsManager } from "@/components/admin/settings-manager";
import { PageHeader } from "@/components/page-header";
import { jsonSafe } from "@/lib/http/serialize";
import { requirePageIdentity } from "@/modules/identity/application/session";
import { listSettings } from "@/modules/settings/application/settings";

export const metadata = { title: "تنظیمات سامانه" };

export default async function SettingsPage() {
  const identity = await requirePageIdentity();
  const settings = await listSettings(identity);
  return (
    <>
      <PageHeader
        title="تنظیمات سامانه"
        description="سیاست‌های مالی بدون تغییر کد قابل مدیریت هستند. تغییرات روی سوابق تأییدشده اثر نمی‌گذارند."
      />
      <SettingsManager
        settings={
          jsonSafe(settings) as Parameters<
            typeof SettingsManager
          >[0]["settings"]
        }
      />
    </>
  );
}
