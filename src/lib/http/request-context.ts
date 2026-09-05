import { createHash, randomUUID } from "node:crypto";

import { headers } from "next/headers";

import { getEnv } from "@/lib/env";

export interface RequestContext {
  correlationId: string;
  ipHash: string | null;
}

export async function getRequestContext(): Promise<RequestContext> {
  const requestHeaders = await headers();
  const correlationId =
    requestHeaders.get("x-request-id")?.slice(0, 100) || randomUUID();
  const forwardedFor = requestHeaders
    .get("x-forwarded-for")
    ?.split(",")[0]
    ?.trim();
  const source = forwardedFor || requestHeaders.get("x-real-ip");
  const ipHash = source
    ? createHash("sha256")
        .update(`${getEnv().SESSION_SECRET}:${source}`)
        .digest("hex")
    : null;
  return { correlationId, ipHash };
}
