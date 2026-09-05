import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { writeAudit } from "@/modules/audit/application/write-audit";
import { createSession } from "@/modules/identity/application/session";
import {
  clearLoginFailures,
  assertNotThrottled,
  recordLoginFailure,
  throttleKey,
} from "@/modules/identity/infrastructure/auth-throttle";
import { getIdentityProvider } from "@/modules/identity/infrastructure/identity-provider";
import { prisma } from "@/lib/db/prisma";

const loginSchema = z.object({
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(512),
});

export async function POST(request: Request) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = loginSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new AppError(
        "VALIDATION_ERROR",
        "نام کاربری و رمز عبور را وارد کنید.",
        400,
      );
    const context = await getRequestContext();
    const keyHash = throttleKey(parsed.data.username, context.ipHash);
    await assertNotThrottled(keyHash);

    try {
      const result = await getIdentityProvider().authenticate(parsed.data);
      await clearLoginFailures(keyHash);
      await createSession(result.user, {
        correlationId,
        ipHash: context.ipHash,
      });
      return { data: { user: result.user } };
    } catch (error) {
      await recordLoginFailure(keyHash);
      await prisma.$transaction((tx) =>
        writeAudit(tx, {
          action: "AUTH_LOGIN_FAILURE",
          entity: "Session",
          metadata: {
            normalizedUsername: parsed.data.username.trim().toLowerCase(),
          },
          correlationId,
          ipHash: context.ipHash,
        }),
      );
      throw error;
    }
  });
}
