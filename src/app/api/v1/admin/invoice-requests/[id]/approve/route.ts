import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { approveRequest } from "@/modules/reviews/application/review";

const schema = z.object({ version: z.number().int().positive() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "نسخه درخواست معتبر نیست.", 400);
    const context = await getRequestContext();
    return {
      data: jsonSafe(
        await approveRequest(
          await requireIdentity(),
          (await params).id,
          parsed.data.version,
          { correlationId, ipHash: context.ipHash },
        ),
      ),
    };
  });
}
