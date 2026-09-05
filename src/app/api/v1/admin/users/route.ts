import { Role } from "@prisma/client";
import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { createUser, listUsers } from "@/modules/users/application/users";

const schema = z.object({
  name: z.string(),
  username: z.string(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  role: z.enum(Role),
  password: z.string(),
});

export async function GET() {
  return apiHandler(async () => ({
    data: jsonSafe(await listUsers(await requireIdentity())),
  }));
}

export async function POST(request: Request) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "اطلاعات کاربر معتبر نیست.", 400);
    const context = await getRequestContext();
    return {
      data: jsonSafe(
        await createUser(await requireIdentity(), parsed.data, {
          correlationId,
          ipHash: context.ipHash,
        }),
      ),
    };
  });
}
