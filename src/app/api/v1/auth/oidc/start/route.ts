import { NextResponse } from "next/server";

import { createAuthorizationUrl } from "@/modules/identity/infrastructure/oidc";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const authorizationUrl = await createAuthorizationUrl(
    url.searchParams.get("next"),
  );
  return NextResponse.redirect(authorizationUrl);
}
