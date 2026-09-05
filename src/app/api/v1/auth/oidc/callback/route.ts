import { NextResponse } from "next/server";

import { getEnv } from "@/lib/env";
import { getRequestContext } from "@/lib/http/request-context";
import { createSession } from "@/modules/identity/application/session";
import { completeAuthorization } from "@/modules/identity/infrastructure/oidc";

export async function GET(request: Request) {
  try {
    const context = await getRequestContext();
    const result = await completeAuthorization(request, context);
    await createSession(result.user, context, result.provider);
    return NextResponse.redirect(new URL(result.returnTo, getEnv().APP_URL));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ورود یکپارچه انجام نشد.";
    const loginUrl = new URL("/login", getEnv().APP_URL);
    loginUrl.searchParams.set("ssoError", message.slice(0, 180));
    return NextResponse.redirect(loginUrl);
  }
}
