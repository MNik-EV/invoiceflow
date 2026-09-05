import { NextResponse } from "next/server";

import { toErrorResponse } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";

export async function apiHandler<T>(
  handler: (correlationId: string) => Promise<T>,
) {
  const { correlationId } = await getRequestContext();
  try {
    const data = await handler(correlationId);
    return NextResponse.json(data, {
      headers: { "x-request-id": correlationId },
    });
  } catch (error) {
    const response = toErrorResponse(error, correlationId);
    return NextResponse.json(response.body, {
      status: response.status,
      headers: { "x-request-id": correlationId },
    });
  }
}
