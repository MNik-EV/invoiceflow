import { createHmac, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import { writeAudit } from "@/modules/audit/application/write-audit";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";

function hashSessionToken(token: string): string {
  return createHmac("sha256", getEnv().SESSION_SECRET)
    .update(token)
    .digest("hex");
}

export async function createSession(
  user: { id: string },
  audit: { correlationId: string; ipHash: string | null },
  provider = "local",
): Promise<void> {
  const env = getEnv();
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(
    Date.now() + env.SESSION_TTL_HOURS * 60 * 60 * 1000,
  );
  await prisma.$transaction(async (tx) => {
    const session = await tx.session.create({
      data: {
        userId: user.id,
        tokenHash: hashSessionToken(token),
        expiresAt,
        provider,
      },
    });
    await writeAudit(tx, {
      userId: user.id,
      action: "AUTH_LOGIN_SUCCESS",
      entity: "Session",
      entityId: session.id,
      correlationId: audit.correlationId,
      ipHash: audit.ipHash,
    });
  });

  const cookieStore = await cookies();
  cookieStore.set(env.SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function getIdentity(): Promise<AuthenticatedIdentity | null> {
  const env = getEnv();
  const token = (await cookies()).get(env.SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          isActive: true,
        },
      },
    },
  });
  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  )
    return null;
  return {
    userId: session.user.id,
    name: session.user.name,
    username: session.user.username,
    role: session.user.role,
    sessionId: session.id,
    provider: session.provider,
  };
}

export async function requireIdentity(): Promise<AuthenticatedIdentity> {
  const identity = await getIdentity();
  if (!identity)
    throw new AppError(
      "AUTHENTICATION_REQUIRED",
      "برای ادامه وارد سامانه شوید.",
      401,
    );
  return identity;
}

export async function requirePageIdentity(): Promise<AuthenticatedIdentity> {
  const identity = await getIdentity();
  if (!identity) redirect("/login");
  return identity;
}

export async function revokeCurrentSession(audit: {
  correlationId: string;
  ipHash: string | null;
}): Promise<void> {
  const identity = await getIdentity();
  const env = getEnv();
  if (identity) {
    await prisma.$transaction(async (tx) => {
      await tx.session.updateMany({
        where: { id: identity.sessionId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "AUTH_LOGOUT",
        entity: "Session",
        entityId: identity.sessionId,
        correlationId: audit.correlationId,
        ipHash: audit.ipHash,
      });
    });
  }
  (await cookies()).delete(env.SESSION_COOKIE_NAME);
}
