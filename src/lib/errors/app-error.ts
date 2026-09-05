export type AppErrorCode =
  | "AUTHENTICATION_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "CONFLICT"
  | "INVALID_REQUEST_TRANSITION"
  | "DUPLICATE_CONFIRMATION_REQUIRED"
  | "FILE_VALIDATION_FAILED"
  | "OIDC_NOT_CONFIGURED"
  | "OIDC_TRANSACTION_INVALID"
  | "OIDC_TRANSACTION_MISSING"
  | "OIDC_CLAIMS_INVALID"
  | "OIDC_ID_TOKEN_MISSING"
  | "OIDC_ACCOUNT_NOT_LINKED"
  | "ACCOUNT_INACTIVE"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status = 400,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function toErrorResponse(error: unknown, correlationId: string) {
  if (error instanceof AppError) {
    return {
      status: error.status,
      body: {
        error: {
          code: error.code,
          message: error.message,
          fieldErrors: error.fieldErrors ?? {},
          requestId: correlationId,
        },
      },
    };
  }

  console.error(JSON.stringify({ level: "error", correlationId, error }));
  return {
    status: 500,
    body: {
      error: {
        code: "INTERNAL_ERROR" as const,
        message: "خطای داخلی رخ داد. لطفاً دوباره تلاش کنید.",
        fieldErrors: {},
        requestId: correlationId,
      },
    },
  };
}
