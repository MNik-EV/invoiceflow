import { headers } from "next/headers";

import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";

export async function assertSameOrigin(): Promise<void> {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (!origin) return;
  if (new URL(origin).origin !== new URL(getEnv().APP_URL).origin) {
    throw new AppError("FORBIDDEN", "مبدأ درخواست معتبر نیست.", 403);
  }
}
