import {
  AttachmentType,
  InvoiceCategory,
  InvoiceRequestStatus,
} from "@prisma/client";

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
import {
  createInvoiceRequest,
  listInvoiceRequests,
} from "@/modules/invoice-requests/application/requests";
import { requestInputSchema } from "@/modules/invoice-requests/application/validation";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const identity = await requireIdentity();
    const rawStatus = new URL(request.url).searchParams.get("status");
    const status =
      rawStatus &&
      Object.values(InvoiceRequestStatus).includes(
        rawStatus as InvoiceRequestStatus,
      )
        ? (rawStatus as InvoiceRequestStatus)
        : undefined;
    const rawCategory = new URL(request.url).searchParams.get("category");
    const category = Object.values(InvoiceCategory).includes(
      rawCategory as InvoiceCategory,
    )
      ? (rawCategory as InvoiceCategory)
      : undefined;
    return {
      data: jsonSafe(await listInvoiceRequests(identity, { status, category })),
    };
  });
}

export async function POST(request: Request) {
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
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION_ERROR",
        "اطلاعات درخواست معتبر نیست.",
        400,
        parsed.error.flatten().fieldErrors,
      );
    }
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
    const created = await createInvoiceRequest(identity, parsed.data, files, {
      correlationId,
      ipHash: context.ipHash,
    });
    return { data: { id: created.id } };
  });
}
