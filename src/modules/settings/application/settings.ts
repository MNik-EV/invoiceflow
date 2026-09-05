import { Role } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/application/write-audit";
import { requireRole } from "@/modules/identity/domain/permissions";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type { AuditContext } from "@/modules/invoice-requests/application/requests";
import { validateSettingValue } from "@/modules/settings/domain/settings";

export async function getAllowance(): Promise<bigint> {
  const setting = await prisma.systemSetting.findUnique({
    where: { key: "lunch.allowance_toman" },
  });
  if (!setting)
    throw new AppError(
      "VALIDATION_ERROR",
      "سهمیه ناهار پیکربندی نشده است.",
      500,
    );
  return BigInt(String(setting.value));
}

export async function listSettings(identity: AuthenticatedIdentity) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  return prisma.systemSetting.findMany({
    include: {
      updatedBy: { select: { name: true } },
      revisions: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { changedAt: "desc" },
        take: 10,
      },
    },
    orderBy: { key: "asc" },
  });
}

export async function updateSetting(
  identity: AuthenticatedIdentity,
  input: { key: string; value: string; expectedVersion: number },
  audit: AuditContext,
) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  const validated = validateSettingValue(input.key, input.value);
  return prisma.$transaction(async (tx) => {
    const current = await tx.systemSetting.findUnique({
      where: { key: validated.key },
    });
    if (!current)
      throw new AppError("NOT_FOUND", "تنظیم موردنظر پیدا نشد.", 404);
    const updated = await tx.systemSetting.updateMany({
      where: { id: current.id, version: input.expectedVersion },
      data: {
        value: validated.value,
        version: { increment: 1 },
        updatedById: identity.userId,
      },
    });
    if (updated.count !== 1)
      throw new AppError(
        "CONFLICT",
        "تنظیم هم‌زمان تغییر کرده است. صفحه را تازه کنید.",
        409,
      );
    await tx.settingRevision.create({
      data: {
        settingId: current.id,
        oldValue: String(current.value),
        newValue: validated.value,
        changedById: identity.userId,
      },
    });
    await writeAudit(tx, {
      userId: identity.userId,
      action: "SYSTEM_SETTING_CHANGED",
      entity: "SystemSetting",
      entityId: current.id,
      metadata: {
        key: validated.key,
        oldValue: String(current.value),
        newValue: validated.value,
      },
      ...audit,
    });
    return { success: true };
  });
}
