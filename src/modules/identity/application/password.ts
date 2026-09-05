import argon2 from "argon2";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { writeAudit } from "@/modules/audit/application/write-audit";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type { AuditContext } from "@/modules/invoice-requests/application/requests";

export async function changeOwnPassword(
  identity: AuthenticatedIdentity,
  input: { currentPassword: string; newPassword: string },
  audit: AuditContext,
) {
  if (input.newPassword.length < 12 || input.newPassword.length > 512) {
    throw new AppError(
      "VALIDATION_ERROR",
      "رمز عبور جدید باید حداقل ۱۲ نویسه باشد.",
      400,
    );
  }
  if (input.currentPassword === input.newPassword) {
    throw new AppError(
      "VALIDATION_ERROR",
      "رمز عبور جدید باید با رمز فعلی متفاوت باشد.",
      400,
    );
  }
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: { passwordHash: true },
  });
  if (
    !user?.passwordHash ||
    !(await argon2
      .verify(user.passwordHash, input.currentPassword)
      .catch(() => false))
  ) {
    throw new AppError("INVALID_CREDENTIALS", "رمز عبور فعلی نادرست است.", 401);
  }
  const passwordHash = await argon2.hash(input.newPassword, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: identity.userId },
      data: { passwordHash },
    });
    await tx.session.updateMany({
      where: {
        userId: identity.userId,
        id: { not: identity.sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
    await writeAudit(tx, {
      userId: identity.userId,
      action: "PASSWORD_CHANGED",
      entity: "User",
      entityId: identity.userId,
      ...audit,
    });
  });
  return { success: true };
}
