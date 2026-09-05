import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { revokeCurrentSession } from "@/modules/identity/application/session";

export async function POST() {
  return apiHandler(async () => {
    await assertSameOrigin();
    const context = await getRequestContext();
    await revokeCurrentSession(context);
    return { data: { success: true } };
  });
}
