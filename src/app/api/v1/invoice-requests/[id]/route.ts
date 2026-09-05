import { AttachmentType } from "@prisma/client";

import { AppError } from "@/lib/errors/app-error";
import { getRequestContext } from "@/lib/http/request-context";
import { apiHandler } from "@/lib/http/route";
import { jsonSafe } from "@/lib/http/serialize";
import { assertSameOrigin } from "@/lib/security/origin";
import {
  assertUploadBodySize,
  fileField,
  optionalStringField,
  stringField,
} from "@/lib/validation/form-data";
import { requireIdentity } from "@/modules/identity/application/session";
import { correctAndResubmit } from "@/modules/invoice-requests/application/correction";
import { getInvoiceRequest } from "@/modules/invoice-requests/application/requests";
import { requestInputSchema } from "@/modules/invoice-requests/application/validation";

export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async () => {
    const identity = await requireIdentity();
    return {
      data: jsonSafe(await getInvoiceRequest(identity, (await params).id)),
    };
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return apiHandler(async (correlationId) => {
    await assertSameOrigin();
    const identity = await requireIdentity();
    assertUploadBodySize(request, 4);
    const form = await request.formData();
    let participantIds: unknown;
    try {
      participantIds = JSON.parse(stringField(form, "participantIds"));
    } catch {
      participantIds = [];
    }
    const parsed = requestInputSchema.safeParse({
      category: stringField(form, "category"),
      invoiceDate: stringField(form, "invoiceDate"),
      title: optionalStringField(form, "title"),
      vendorName: optionalStringField(form, "vendorName"),
      purchaseCategory: optionalStringField(form, "purchaseCategory"),
      participantIds,
      invoiceAmount: stringField(form, "invoiceAmount"),
      description: optionalStringField(form, "description"),
      duplicateConfirmed: stringField(form, "duplicateConfirmed") === "true",
    });
    const expectedVersion = Number(stringField(form, "version"));
    if (!parsed.success || !Number.isInteger(expectedVersion))
      throw new AppError(
        "VALIDATION_ERROR",
        "اطلاعات درخواست معتبر نیست.",
        400,
      );
    const invoice = fileField(form, "invoice");
    const paymentProof = fileField(form, "paymentProof");
    const foodImage = fileField(form, "foodImage");
    const supportingDocument = fileField(form, "supportingDocument");
    const files = [
      ...(invoice ? [{ file: invoice, type: AttachmentType.INVOICE }] : []),
      ...(paymentProof
        ? [{ file: paymentProof, type: AttachmentType.PAYMENT_PROOF }]
        : []),
      ...(foodImage
        ? [{ file: foodImage, type: AttachmentType.FOOD_IMAGE }]
        : []),
      ...(supportingDocument
        ? [
            {
              file: supportingDocument,
              type: AttachmentType.SUPPORTING_DOCUMENT,
            },
          ]
        : []),
    ];
    const context = await getRequestContext();
    return {
      data: await correctAndResubmit(
        identity,
        (await params).id,
        expectedVersion,
        parsed.data,
        files,
        { correlationId, ipHash: context.ipHash },
      ),
    };
  });
}
