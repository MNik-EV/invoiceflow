import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { requireIdentity } from "@/modules/identity/application/session";
import { listSettings } from "@/modules/settings/application/settings";

export async function GET() {
  return apiHandler(async () => ({
    data: jsonSafe(await listSettings(await requireIdentity())),
  }));
}
