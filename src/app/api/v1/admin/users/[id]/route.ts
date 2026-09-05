import { Role } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { updateUser } from "@/modules/users/application/users";

const schema = z.object({
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(Role),
  isActive: z.boolean(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "اطلاعات کاربر معتبر نیست.", 400);
    const context = await getRequestContext();
    return {
      data: await updateUser(
        await requireIdentity(),
        (await params).id,
        parsed.data,
        { correlationId, ipHash: context.ipHash },
      ),
    };
  });
}
