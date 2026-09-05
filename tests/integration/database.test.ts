import { randomUUID } from "node:crypto";

import { Role } from "@prisma/client";
import argon2 from "argon2";
import { afterAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/db/prisma";
import { LocalIdentityProvider } from "@/modules/identity/infrastructure/local-identity-provider";

const enabled = Boolean(process.env.TEST_DATABASE_URL);

describe.skipIf(!enabled)("PostgreSQL integration", () => {
  afterAll(async () => prisma.$disconnect());

  it("enforces unique participants and rolls back the transaction", async () => {
    const suffix = randomUUID().slice(0, 8);
    const user = await prisma.user.create({
      data: {
        name: "Integration User",
        username: `it-${suffix}`,
        normalizedUsername: `it-${suffix}`,
        role: Role.USER,
      },
    });
    await expect(
      prisma.$transaction(async (tx) => {
        const request = await tx.invoiceRequest.create({
          data: {
            creatorId: user.id,
            invoiceDate: new Date("2026-08-23T00:00:00.000Z"),
            invoiceAmount: 1000n,
          },
        });
        await tx.invoiceParticipant.createMany({
          data: [
            { requestId: request.id, userId: user.id },
            { requestId: request.id, userId: user.id },
          ],
        });
      }),
    ).rejects.toThrow();
    expect(
      await prisma.invoiceRequest.count({ where: { creatorId: user.id } }),
    ).toBe(0);
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("authenticates an active local user and rejects a bad password", async () => {
    const suffix = randomUUID().slice(0, 8);
    const username = `auth-${suffix}`;
    const user = await prisma.user.create({
      data: {
        name: "Auth Integration User",
        username,
        normalizedUsername: username,
        role: Role.USER,
        passwordHash: await argon2.hash("integration-password-123"),
      },
    });
    const provider = new LocalIdentityProvider();
    await expect(
      provider.authenticate({ username, password: "integration-password-123" }),
    ).resolves.toMatchObject({ user: { id: user.id, role: Role.USER } });
    await expect(
      provider.authenticate({ username, password: "wrong-password" }),
    ).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    await prisma.user.delete({ where: { id: user.id } });
  });
});
