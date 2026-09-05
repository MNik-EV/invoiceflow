import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { updateSetting } from "@/modules/settings/application/settings";

const schema = z.object({
  value: z.string().min(1).max(30),
  version: z.number().int().positive(),
});

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "مقدار تنظیم معتبر نیست.", 400);
    const context = await getRequestContext();
    return {
      data: await updateSetting(
        await requireIdentity(),
        {
          key: decodeURIComponent((await params).key),
          value: parsed.data.value,
          expectedVersion: parsed.data.version,
        },
        { correlationId, ipHash: context.ipHash },
      ),
    };
  });
}
