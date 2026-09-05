import {
  AttachmentType,
  InvoiceRequestStatus,
  StorageStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  archiveUploads,
  removeArchivedUploads,
} from "@/modules/attachments/application/archive-uploads";
import { writeAudit } from "@/modules/audit/application/write-audit";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type {
  AuditContext,
  InvoiceRequestInput,
} from "@/modules/invoice-requests/application/requests";
import { validateRequestInput } from "@/modules/invoice-requests/application/requests";
import { assertRequestTransition } from "@/modules/invoice-requests/domain/policy";

export async function correctAndResubmit(
  identity: AuthenticatedIdentity,
  requestId: string,
  expectedVersion: number,
  input: InvoiceRequestInput,
  files: Array<{ file: File; type: AttachmentType }>,
  audit: AuditContext,
) {
  const existing = await prisma.invoiceRequest.findUnique({
    where: { id: requestId },
    select: { creatorId: true, status: true, category: true },
  });
  if (!existing || existing.creatorId !== identity.userId)
    throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
  if (existing.category !== input.category)
    throw new AppError(
      "VALIDATION_ERROR",
      "نوع فاکتور هنگام اصلاح قابل تغییر نیست.",
      400,
    );
  assertRequestTransition(existing.status, InvoiceRequestStatus.PENDING_REVIEW);
  const archived = files.length
    ? await archiveUploads(files, requestId, input.invoiceDate)
    : [];
  try {
    return await prisma.$transaction(async (tx) => {
      const participantIds = await validateRequestInput(tx, input);
      const updated = await tx.invoiceRequest.updateMany({
        where: {
          id: requestId,
          creatorId: identity.userId,
          status: InvoiceRequestStatus.REJECTED,
          version: expectedVersion,
        },
        data: {
          invoiceDate: input.invoiceDate,
          title: input.title,
          vendorName: input.vendorName,
          purchaseCategory: input.purchaseCategory,
          invoiceAmount: input.invoiceAmount,
          description: input.description,
          duplicateConfirmed: input.duplicateConfirmed,
          status: InvoiceRequestStatus.PENDING_REVIEW,
          rejectionReason: null,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new AppError(
          "CONFLICT",
          "درخواست هم‌زمان تغییر کرده است. صفحه را تازه کنید.",
          409,
        );
      await tx.invoiceParticipant.deleteMany({ where: { requestId } });
      if (participantIds.length)
        await tx.invoiceParticipant.createMany({
          data: participantIds.map((userId) => ({ requestId, userId })),
        });
      if (archived.length)
        await tx.attachment.createMany({
          data: archived.map((item) => ({
            id: item.id,
            requestId,
            type: item.type,
            storageStatus: StorageStatus.AVAILABLE,
            storageKey: item.storageKey,
            originalName: item.originalName,
            mediaType: item.mediaType,
            byteSize: item.byteSize,
            sha256: item.sha256,
            uploadedById: identity.userId,
          })),
        });
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: InvoiceRequestStatus.REJECTED,
          toStatus: InvoiceRequestStatus.PENDING_REVIEW,
          changedById: identity.userId,
        },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "INVOICE_REQUEST_RESUBMITTED",
        entity: "InvoiceRequest",
        entityId: requestId,
        metadata: {
          category: input.category,
          participantCount: participantIds.length,
          newAttachmentCount: archived.length,
        },
        ...audit,
      });
      return { id: requestId };
    });
  } catch (error) {
    await removeArchivedUploads(archived);
    throw error;
  }
}
