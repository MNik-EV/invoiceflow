import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { listAuditLogs } from "@/modules/audit/application/list-audit";
import { requireIdentity } from "@/modules/identity/application/session";

export async function GET() {
  return apiHandler(async () => ({
    data: jsonSafe(await listAuditLogs(await requireIdentity())),
  }));
}
