import { apiHandler } from "@/lib/http/route";
import { requireIdentity } from "@/modules/identity/application/session";
import { listActiveParticipants } from "@/modules/invoice-requests/application/requests";

export async function GET() {
  return apiHandler(async () => {
    await requireIdentity();
    return { data: await listActiveParticipants() };
  });
}
