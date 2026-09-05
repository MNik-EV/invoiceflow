import argon2 from "argon2";

import { AppError } from "@/lib/errors/app-error";
import { prisma } from "@/lib/db/prisma";
import type {
  AuthenticationResult,
  IdentityProvider,
} from "@/modules/identity/domain/types";

let dummyHash: Promise<string> | undefined;

function getDummyHash() {
  dummyHash ??= argon2.hash("invalid-credential-timing-equalizer", {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });
  return dummyHash;
}

export class LocalIdentityProvider implements IdentityProvider {
  readonly name = "local";

  async authenticate(input: {
    username: string;
    password: string;
  }): Promise<AuthenticationResult> {
    const normalizedUsername = input.username.trim().toLocaleLowerCase("en-US");
    const user = await prisma.user.findUnique({
      where: { normalizedUsername },
    });
    const hash = user?.passwordHash ?? (await getDummyHash());
    const passwordMatches = await argon2
      .verify(hash, input.password)
      .catch(() => false);

    if (!user || !passwordMatches || !user.isActive) {
      throw new AppError(
        "INVALID_CREDENTIALS",
        "نام کاربری یا رمز عبور نادرست است.",
        401,
      );
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
      },
    };
  }
}
