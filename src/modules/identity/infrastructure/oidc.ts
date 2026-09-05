import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

import { Role } from "@prisma/client";
import { cookies } from "next/headers";
import * as oidc from "openid-client";

import { prisma } from "@/lib/db/prisma";
import { getEnv } from "@/lib/env";
import { AppError } from "@/lib/errors/app-error";
import { writeAudit } from "@/modules/audit/application/write-audit";

const STATE_COOKIE = "invoice_oidc_transaction";
const STATE_TTL_SECONDS = 10 * 60;

interface OidcTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  returnTo: string;
  issuedAt: number;
}

function settings() {
  const env = getEnv();
  if (
    !["oidc", "hybrid"].includes(env.AUTH_PROVIDER) ||
    !env.OIDC_ISSUER_URL ||
    !env.OIDC_CLIENT_ID ||
    !env.OIDC_REDIRECT_URI
  )
    throw new AppError(
      "OIDC_NOT_CONFIGURED",
      "ورود یکپارچه سازمانی پیکربندی نشده است.",
      503,
    );
  return {
    env,
    issuer: new URL(env.OIDC_ISSUER_URL),
    clientId: env.OIDC_CLIENT_ID,
    clientSecret: env.OIDC_CLIENT_SECRET || undefined,
    redirectUri: env.OIDC_REDIRECT_URI,
  };
}

let configurationPromise: Promise<oidc.Configuration> | undefined;

export function isOidcEnabled() {
  const env = getEnv();
  return (
    ["oidc", "hybrid"].includes(env.AUTH_PROVIDER) &&
    Boolean(env.OIDC_ISSUER_URL && env.OIDC_CLIENT_ID && env.OIDC_REDIRECT_URI)
  );
}

export function isLocalLoginEnabled() {
  return ["local", "hybrid"].includes(getEnv().AUTH_PROVIDER);
}

async function getConfiguration() {
  const config = settings();
  configurationPromise ??= oidc.discovery(
    config.issuer,
    config.clientId,
    config.clientSecret,
  );
  return configurationPromise;
}

function encryptionKey() {
  return createHash("sha256").update(getEnv().SESSION_SECRET).digest();
}

function seal(value: OidcTransaction) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString(
    "base64url",
  );
}

function unseal(value: string): OidcTransaction {
  try {
    const payload = Buffer.from(value, "base64url");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      encryptionKey(),
      payload.subarray(0, 12),
    );
    decipher.setAuthTag(payload.subarray(12, 28));
    const decoded = JSON.parse(
      Buffer.concat([
        decipher.update(payload.subarray(28)),
        decipher.final(),
      ]).toString("utf8"),
    ) as OidcTransaction;
    if (
      !decoded.state ||
      !decoded.nonce ||
      !decoded.codeVerifier ||
      Date.now() - decoded.issuedAt > STATE_TTL_SECONDS * 1000
    )
      throw new Error("expired");
    return decoded;
  } catch {
    throw new AppError(
      "OIDC_TRANSACTION_INVALID",
      "نشست ورود یکپارچه منقضی یا نامعتبر است. دوباره تلاش کنید.",
      400,
    );
  }
}

function safeReturnTo(value: string | null) {
  return value?.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function createAuthorizationUrl(returnTo: string | null) {
  const config = settings();
  const clientConfiguration = await getConfiguration();
  const codeVerifier = oidc.randomPKCECodeVerifier();
  const transaction: OidcTransaction = {
    codeVerifier,
    state: oidc.randomState(),
    nonce: oidc.randomNonce(),
    returnTo: safeReturnTo(returnTo),
    issuedAt: Date.now(),
  };
  (await cookies()).set(STATE_COOKIE, seal(transaction), {
    httpOnly: true,
    secure: config.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/v1/auth/oidc",
    maxAge: STATE_TTL_SECONDS,
    priority: "high",
  });
  return oidc.buildAuthorizationUrl(clientConfiguration, {
    redirect_uri: config.redirectUri,
    scope: config.env.OIDC_SCOPES,
    response_type: "code",
    code_challenge: await oidc.calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: "S256",
    state: transaction.state,
    nonce: transaction.nonce,
  });
}

function providerKey(issuer: string) {
  return `oidc:${createHash("sha256").update(issuer).digest("hex").slice(0, 24)}`;
}

function normalizedUsername(claims: Record<string, unknown>) {
  const raw = String(
    claims.preferred_username ||
      (typeof claims.email === "string" ? claims.email.split("@")[0] : "") ||
      `user-${String(claims.sub).slice(0, 12)}`,
  )
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  const suffix = createHash("sha256")
    .update(String(claims.sub))
    .digest("hex")
    .slice(0, 8);
  return `${raw || "user"}-${suffix}`;
}

async function resolveUser(
  claims: Record<string, unknown>,
  audit: { correlationId: string; ipHash: string | null },
) {
  const config = settings();
  const subject = typeof claims.sub === "string" ? claims.sub : null;
  if (!subject)
    throw new AppError(
      "OIDC_CLAIMS_INVALID",
      "شناسه کاربر در پاسخ سرویس ورود وجود ندارد.",
      401,
    );
  const provider = providerKey(config.issuer.href);
  const linked = await prisma.externalIdentity.findUnique({
    where: { provider_subject: { provider, subject } },
    include: { user: true },
  });
  if (linked) {
    if (!linked.user.isActive)
      throw new AppError("ACCOUNT_INACTIVE", "حساب کاربری غیرفعال است.", 403);
    return { user: linked.user, provider };
  }

  const email = typeof claims.email === "string" ? claims.email : null;
  const verified = claims.email_verified === true;
  const existing =
    email && verified
      ? await prisma.user.findUnique({
          where: { normalizedEmail: email.toLowerCase() },
        })
      : null;
  if (!existing && !config.env.OIDC_AUTO_PROVISION)
    throw new AppError(
      "OIDC_ACCOUNT_NOT_LINKED",
      "برای این حساب سازمانی هنوز کاربری تعریف نشده است.",
      403,
    );
  if (existing && !existing.isActive)
    throw new AppError("ACCOUNT_INACTIVE", "حساب کاربری غیرفعال است.", 403);

  const user = await prisma.$transaction(async (tx) => {
    const target =
      existing ??
      (await tx.user.create({
        data: {
          name:
            (typeof claims.name === "string" && claims.name.slice(0, 160)) ||
            normalizedUsername(claims),
          username: normalizedUsername(claims),
          normalizedUsername: normalizedUsername(claims),
          email,
          normalizedEmail: email?.toLowerCase() ?? null,
          role: Role.USER,
        },
      }));
    await tx.externalIdentity.create({
      data: { userId: target.id, provider, subject },
    });
    await writeAudit(tx, {
      userId: target.id,
      action: existing ? "OIDC_IDENTITY_LINKED" : "OIDC_USER_PROVISIONED",
      entity: "User",
      entityId: target.id,
      metadata: { provider, emailVerified: verified },
      ...audit,
    });
    return target;
  });
  return { user, provider };
}

export async function completeAuthorization(
  request: Request,
  audit: { correlationId: string; ipHash: string | null },
) {
  const cookieStore = await cookies();
  const rawTransaction = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);
  if (!rawTransaction)
    throw new AppError(
      "OIDC_TRANSACTION_MISSING",
      "نشست ورود یکپارچه پیدا نشد. دوباره تلاش کنید.",
      400,
    );
  const transaction = unseal(rawTransaction);
  const tokens = await oidc.authorizationCodeGrant(
    await getConfiguration(),
    request,
    {
      pkceCodeVerifier: transaction.codeVerifier,
      expectedState: transaction.state,
      expectedNonce: transaction.nonce,
      idTokenExpected: true,
    },
  );
  const claims = tokens.claims();
  if (!claims)
    throw new AppError(
      "OIDC_ID_TOKEN_MISSING",
      "سرویس ورود، شناسه معتبر کاربر را بازنگرداند.",
      401,
    );
  return {
    ...(await resolveUser(claims as unknown as Record<string, unknown>, audit)),
    returnTo: transaction.returnTo,
  };
}
