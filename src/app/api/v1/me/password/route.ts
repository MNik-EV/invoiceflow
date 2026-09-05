import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { changeOwnPassword } from "@/modules/identity/application/password";
import { requireIdentity } from "@/modules/identity/application/session";

const schema = z.object({
  currentPassword: z.string().min(1).max(512),
  newPassword: z.string().min(12).max(512),
});

export async function PUT(request: Request) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        "رمز عبور جدید باید حداقل ۱۲ نویسه باشد.",
        400,
      );
    }
    const context = await getRequestContext();
    return {
      data: await changeOwnPassword(await requireIdentity(), parsed.data, {
        correlationId,
        ipHash: context.ipHash,
      }),
    };
  });
}
