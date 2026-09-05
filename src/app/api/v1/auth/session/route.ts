import { apiHandler } from "@/lib/http/route";
import { requireIdentity } from "@/modules/identity/application/session";

export async function GET() {
  return apiHandler(async () => ({ data: { user: await requireIdentity() } }));
}
