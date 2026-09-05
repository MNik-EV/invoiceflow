import { NextRequest, NextResponse } from "next/server";

const publicPaths = [
  "/login",
  "/api/v1/auth/login",
  "/api/v1/auth/oidc",
  "/api/health/live",
  "/api/health/ready",
  "/logo.svg",
  "/icon.svg",
];

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
  const cookieName = process.env.SESSION_COOKIE_NAME || "invoice_session";
  const hasSessionCookie = Boolean(request.cookies.get(cookieName)?.value);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(
    "x-request-id",
    request.headers.get("x-request-id") || crypto.randomUUID(),
  );
  const nonce = btoa(crypto.randomUUID());
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' blob: data:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(process.env.NODE_ENV === "production"
      ? ["upgrade-insecure-requests"]
      : []),
  ].join("; ");
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const secure = (response: NextResponse) => {
    response.headers.set("Content-Security-Policy", csp);
    return response;
  };

  if (
    !isPublic &&
    !hasSessionCookie &&
    !pathname.startsWith("/_next") &&
    pathname !== "/favicon.ico"
  ) {
    if (pathname.startsWith("/api/")) {
      return secure(
        NextResponse.json(
          {
            error: {
              code: "AUTHENTICATION_REQUIRED",
              message: "برای ادامه وارد سامانه شوید.",
              fieldErrors: {},
            },
          },
          { status: 401 },
        ),
      );
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return secure(NextResponse.redirect(loginUrl));
  }

  return secure(NextResponse.next({ request: { headers: requestHeaders } }));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
