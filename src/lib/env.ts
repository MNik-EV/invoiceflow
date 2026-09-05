import { z } from "zod";

const optionalUrl = z.string().url().optional().or(z.literal(""));

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  SESSION_COOKIE_NAME: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .default("invoice_session"),
  SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(12),
  SESSION_SECRET: z.string().min(32),
  AUTH_PROVIDER: z.enum(["local", "oidc", "hybrid"]).default("local"),
  BANK_ENCRYPTION_KEY: z.string().refine((value) => {
    try {
      return Buffer.from(value, "base64").length === 32;
    } catch {
      return false;
    }
  }, "must be a base64-encoded 32-byte key"),
  BANK_ENCRYPTION_KEY_ID: z.string().min(1).default("local-v1"),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  STORAGE_ROOT: z.string().min(1).default("./storage"),
  UPLOAD_MAX_FILE_BYTES: z.coerce
    .number()
    .int()
    .min(1024)
    .max(50 * 1024 * 1024)
    .default(10 * 1024 * 1024),
  OIDC_ISSUER_URL: optionalUrl,
  OIDC_CLIENT_ID: z.string().optional(),
  OIDC_CLIENT_SECRET: z.string().optional(),
  OIDC_REDIRECT_URI: optionalUrl,
  OIDC_SCOPES: z.string().default("openid profile email"),
  OIDC_DISPLAY_NAME: z.string().default("ورود یکپارچه سازمانی"),
  OIDC_AUTO_PROVISION: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
  S3_ENDPOINT: optionalUrl,
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
});

export type AppEnv = z.infer<typeof envSchema>;

let cachedEnv: AppEnv | undefined;

export function getEnv(): AppEnv {
  if (cachedEnv) return cachedEnv;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fields = Object.keys(z.flattenError(parsed.error).fieldErrors).join(
      ", ",
    );
    throw new Error(`پیکربندی محیطی نامعتبر است: ${fields}`);
  }
  cachedEnv = parsed.data;
  return cachedEnv;
}
