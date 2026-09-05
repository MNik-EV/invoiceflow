import { z } from "zod";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { assertSameOrigin } from "@/lib/security/origin";
import { requireIdentity } from "@/modules/identity/application/session";
import {
  getOwnBankProfile,
  updateOwnBankProfile,
} from "@/modules/users/application/bank";

const bankSchema = z.object({
  cardNumber: z.string().min(1).max(30),
  iban: z.string().min(1).max(40),
});

export async function GET() {
  return apiHandler(async () => ({
    data: await getOwnBankProfile(await requireIdentity()),
  }));
}

export async function PUT(request: Request) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const identity = await requireIdentity();
    const parsed = bankSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success)
      throw new AppError("VALIDATION_ERROR", "اطلاعات بانکی کامل نیست.", 400);
    const context = await getRequestContext();
    return {
      data: await updateOwnBankProfile(identity, parsed.data, {
        correlationId,
        ipHash: context.ipHash,
      }),
    };
  });
}
