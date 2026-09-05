import type { Prisma } from "@prisma/client";

export interface AuditInput {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
  correlationId: string;
  ipHash?: string | null;
}

export function writeAudit(tx: Prisma.TransactionClient, input: AuditInput) {
  return tx.auditLog.create({
    data: {
      userId: input.userId ?? null,
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      metadata: input.metadata ?? {},
      correlationId: input.correlationId,
      ipHash: input.ipHash ?? null,
    },
  });
}
