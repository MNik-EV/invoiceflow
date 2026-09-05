import { Role } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";

export const ADMIN_ROLES: readonly Role[] = [
  Role.FINANCE_ADMIN,
  Role.SUPER_ADMIN,
];

export function isFinanceAdmin(role: Role): boolean {
  return ADMIN_ROLES.includes(role);
}

export function requireRole(
  identity: AuthenticatedIdentity,
  roles: readonly Role[],
): void {
  if (!roles.includes(identity.role))
    throw new AppError("FORBIDDEN", "اجازه انجام این عملیات را ندارید.", 403);
}

export function canViewRequest(
  identity: AuthenticatedIdentity,
  creatorId: string,
): boolean {
  return isFinanceAdmin(identity.role) || identity.userId === creatorId;
}

export function assertCanViewRequest(
  identity: AuthenticatedIdentity,
  creatorId: string,
): void {
  if (!canViewRequest(identity, creatorId))
    throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
}
