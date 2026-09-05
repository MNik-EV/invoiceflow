import { createHash } from "node:crypto";

import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 8;

export function throttleKey(username: string, ipHash: string | null): string {
  return createHash("sha256")
    .update(
      `${getEnv().SESSION_SECRET}:${username.trim().toLowerCase()}:${ipHash ?? "unknown"}`,
    )
    .digest("hex");
}

export async function assertNotThrottled(keyHash: string): Promise<void> {
  const throttle = await prisma.authThrottle.findUnique({ where: { keyHash } });
  if (throttle?.lockedUntil && throttle.lockedUntil > new Date()) {
    throw new AppError(
      "INVALID_CREDENTIALS",
      "تعداد تلاش‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.",
      429,
    );
  }
}

export async function recordLoginFailure(keyHash: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction(async (tx) => {
    const existing = await tx.authThrottle.findUnique({ where: { keyHash } });
    const expired =
      !existing ||
      now.getTime() - existing.windowStartedAt.getTime() > WINDOW_MS;
    const failureCount = expired ? 1 : existing.failureCount + 1;
    const lockedUntil =
      failureCount >= MAX_FAILURES ? new Date(now.getTime() + WINDOW_MS) : null;
    await tx.authThrottle.upsert({
      where: { keyHash },
      create: { keyHash, failureCount, windowStartedAt: now, lockedUntil },
      update: {
        failureCount,
        windowStartedAt: expired ? now : existing.windowStartedAt,
        lockedUntil,
      },
    });
  });
}

export async function clearLoginFailures(keyHash: string): Promise<void> {
  await prisma.authThrottle.deleteMany({ where: { keyHash } });
}
