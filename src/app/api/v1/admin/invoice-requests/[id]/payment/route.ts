import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { jalaliToDatabaseDate } from "@/lib/i18n/date";
import { parseToman } from "@/lib/i18n/numbers";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import { recordPayment } from "@/modules/reviews/application/review";

const schema = z.object({
  version: z.number().int().positive(),
  amount: z.string().transform((value, context) => {
    try {
      return parseToman(value);
    } catch {
      context.addIssue({ code: "custom", message: "مبلغ معتبر نیست." });
      return z.NEVER;
    }
  }),
  paidOn: z.string().transform((value, context) => {
    try {
      return jalaliToDatabaseDate(value);
    } catch {
      context.addIssue({ code: "custom", message: "تاریخ معتبر نیست." });
      return z.NEVER;
    }
  }),
  trackingCode: z.string().trim().min(1).max(120),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError(
        "VALIDATION_ERROR",
        "اطلاعات پرداخت معتبر نیست.",
        400,
        parsed.error.flatten().fieldErrors,
      );
    const context = await getRequestContext();
    return {
      data: jsonSafe(
        await recordPayment(
          await requireIdentity(),
          {
            requestId: (await params).id,
            expectedVersion: parsed.data.version,
            amount: parsed.data.amount,
            paidOn: parsed.data.paidOn,
            trackingCode: parsed.data.trackingCode,
          },
          { correlationId, ipHash: context.ipHash },
        ),
      ),
    };
  });
}
