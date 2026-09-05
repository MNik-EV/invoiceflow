import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import type { IdentityProvider } from "@/modules/identity/domain/types";
import { LocalIdentityProvider } from "@/modules/identity/infrastructure/local-identity-provider";

export function getIdentityProvider(): IdentityProvider {
  const provider = getEnv().AUTH_PROVIDER;
  if (provider === "local" || provider === "hybrid")
    return new LocalIdentityProvider();
  throw new AppError(
    "FORBIDDEN",
    `ورود محلی در حالت ${provider} غیرفعال است.`,
    403,
  );
}
