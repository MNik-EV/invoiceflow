import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { rejectRequest } from "@/modules/reviews/application/review";

const schema = z.object({
  version: z.number().int().positive(),
  reason: z.string().trim().min(3).max(1000),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "دلیل رد معتبر نیست.", 400);
    const context = await getRequestContext();
    return {
      data: await rejectRequest(
        await requireIdentity(),
        (await params).id,
        parsed.data.version,
        parsed.data.reason,
        { correlationId, ipHash: context.ipHash },
      ),
    };
  });
}
