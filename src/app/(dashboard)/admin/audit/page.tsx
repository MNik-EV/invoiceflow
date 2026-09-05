import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { formatJalaliDateTime } from "@/lib/i18n/date";
import { listAuditLogs } from "@/modules/audit/application/list-audit";
import { requirePageIdentity } from "@/modules/identity/application/session";

export const metadata = { title: "رویدادهای ممیزی" };

export default async function AuditPage() {
  const logs = await listAuditLogs(await requirePageIdentity());
  return (
    <>
      <PageHeader
        title="رویدادهای ممیزی"
        description="آخرین عملیات امنیتی، مدیریتی و مالی سامانه"
      />
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-right text-sm">
            <thead className="bg-slate-50 text-xs text-slate-500">
              <tr>
                {["زمان", "کاربر", "عملیات", "موجودیت", "شناسه پیگیری"].map(
                  (item) => (
                    <th className="px-4 py-3" key={item}>
                      {item}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {formatJalaliDateTime(log.timestamp)}
                  </td>
                  <td className="px-4 py-3">
                    {log.user?.name ?? "ناشناس/سیستم"}
                  </td>
                  <td className="numeric px-4 py-3" dir="ltr">
                    {log.action}
                  </td>
                  <td className="numeric px-4 py-3" dir="ltr">
                    {log.entity}
                  </td>
                  <td
                    className="numeric max-w-52 truncate px-4 py-3 text-xs"
                    dir="ltr"
                    title={log.correlationId}
                  >
                    {log.correlationId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
