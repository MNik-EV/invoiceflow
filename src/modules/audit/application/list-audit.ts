import { Role } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { requireRole } from "@/modules/identity/domain/permissions";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";

export async function listAuditLogs(
  identity: AuthenticatedIdentity,
  take = 200,
) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  return prisma.auditLog.findMany({
    include: { user: { select: { name: true, username: true } } },
    orderBy: { timestamp: "desc" },
    take: Math.min(take, 500),
  });
}
