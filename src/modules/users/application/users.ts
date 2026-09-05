import argon2 from "argon2";
import { Role } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/application/write-audit";
import { requireRole } from "@/modules/identity/domain/permissions";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type { AuditContext } from "@/modules/invoice-requests/application/requests";

export interface UserInput {
  name: string;
  username: string;
  email: string | null;
  phone: string | null;
  role: Role;
}

function normalizeUserInput(
  input: UserInput,
): UserInput & { normalizedUsername: string; normalizedEmail: string | null } {
  const name = input.name.trim();
  const username = input.username.trim();
  const email = input.email?.trim().toLowerCase() || null;
  const phone = input.phone?.trim() || null;
  if (
    name.length < 2 ||
    name.length > 160 ||
    !/^[a-zA-Z0-9._-]{3,80}$/.test(username)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "نام یا نام کاربری معتبر نیست.",
      400,
    );
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new AppError("VALIDATION_ERROR", "ایمیل معتبر نیست.", 400);
  if (phone && !/^\+?\d{10,15}$/.test(phone))
    throw new AppError("VALIDATION_ERROR", "شماره تلفن معتبر نیست.", 400);
  return {
    name,
    username,
    email,
    phone,
    role: input.role,
    normalizedUsername: username.toLowerCase(),
    normalizedEmail: email,
  };
}

export async function listUsers(identity: AuthenticatedIdentity) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createUser(
  identity: AuthenticatedIdentity,
  input: UserInput & { password: string },
  audit: AuditContext,
) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  const normalized = normalizeUserInput(input);
  if (input.password.length < 12 || input.password.length > 512)
    throw new AppError(
      "VALIDATION_ERROR",
      "رمز عبور باید حداقل ۱۲ نویسه باشد.",
      400,
    );
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  try {
    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...normalized, passwordHash },
        select: {
          id: true,
          name: true,
          username: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "USER_CREATED",
        entity: "User",
        entityId: user.id,
        metadata: { role: user.role },
        ...audit,
      });
      return user;
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
      throw new AppError("CONFLICT", "نام کاربری یا ایمیل تکراری است.", 409);
    throw error;
  }
}

export async function updateUser(
  identity: AuthenticatedIdentity,
  userId: string,
  input: UserInput & { isActive: boolean },
  audit: AuditContext,
) {
  requireRole(identity, [Role.SUPER_ADMIN]);
  const normalized = normalizeUserInput(input);
  if (
    userId === identity.userId &&
    (!input.isActive || input.role !== Role.SUPER_ADMIN)
  ) {
    throw new AppError(
      "VALIDATION_ERROR",
      "نمی‌توانید دسترسی مدیر کل فعلی خود را حذف کنید.",
      400,
    );
  }
  return prisma.$transaction(async (tx) => {
    const current = await tx.user.findUnique({ where: { id: userId } });
    if (!current) throw new AppError("NOT_FOUND", "کاربر پیدا نشد.", 404);
    if (
      current.role === Role.SUPER_ADMIN &&
      current.isActive &&
      (!input.isActive || input.role !== Role.SUPER_ADMIN)
    ) {
      const activeSuperAdmins = await tx.user.count({
        where: { role: Role.SUPER_ADMIN, isActive: true },
      });
      if (activeSuperAdmins <= 1)
        throw new AppError(
          "VALIDATION_ERROR",
          "حداقل یک مدیر کل فعال باید باقی بماند.",
          400,
        );
    }
    const updated = await tx.user.update({
      where: { id: userId },
      data: { ...normalized, isActive: input.isActive },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!input.isActive || current.role !== input.role)
      await tx.session.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    await writeAudit(tx, {
      userId: identity.userId,
      action: "USER_CHANGED",
      entity: "User",
      entityId: userId,
      metadata: {
        oldRole: current.role,
        newRole: input.role,
        oldActive: current.isActive,
        newActive: input.isActive,
      },
      ...audit,
    });
    return updated;
  });
}
