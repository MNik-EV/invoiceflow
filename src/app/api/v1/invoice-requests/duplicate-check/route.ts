import { AppError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { findDuplicateRequests } from "@/modules/invoice-requests/application/requests";
import { duplicateInputSchema } from "@/modules/invoice-requests/application/validation";

export async function POST(request: Request) {
  return apiHandler(async () => {
    await assertSameOrigin();
    const identity = await requireIdentity();
    const parsed = duplicateInputSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!parsed.success)
      throw new AppError(
        "VALIDATION_ERROR",
        "اطلاعات درخواست معتبر نیست.",
        400,
      );
    return {
      data: {
        candidates: await findDuplicateRequests(identity.userId, parsed.data),
      },
    };
  });
}
