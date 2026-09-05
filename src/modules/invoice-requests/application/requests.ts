import { randomUUID } from "node:crypto";

import {
  AttachmentType,
  InvoiceCategory,
  InvoiceRequestStatus,
  LabPurchaseCategory,
  Prisma,
  StorageStatus,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import {
  archiveUploads,
  removeArchivedUploads,
} from "@/modules/attachments/application/archive-uploads";
import { writeAudit } from "@/modules/audit/application/write-audit";
import {
  assertCanViewRequest,
  isFinanceAdmin,
} from "@/modules/identity/domain/permissions";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";

export interface InvoiceRequestInput {
  category: InvoiceCategory;
  invoiceDate: Date;
  title: string | null;
  vendorName: string | null;
  purchaseCategory?: LabPurchaseCategory | null;
  participantIds: string[];
  invoiceAmount: bigint;
  description: string | null;
  duplicateConfirmed: boolean;
}

export interface AuditContext {
  correlationId: string;
  ipHash: string | null;
}

export async function findDuplicateRequests(
  creatorId: string,
  input: InvoiceRequestInput,
) {
  const candidates = await prisma.invoiceRequest.findMany({
    where: {
      creatorId,
      category: input.category,
      invoiceDate: input.invoiceDate,
      status: { not: InvoiceRequestStatus.REJECTED },
      OR: [
        { invoiceAmount: input.invoiceAmount },
        ...(input.participantIds.length
          ? [
              {
                participants: {
                  some: { userId: { in: input.participantIds } },
                },
              } satisfies Prisma.InvoiceRequestWhereInput,
            ]
          : []),
      ],
    },
    select: {
      id: true,
      invoiceAmount: true,
      status: true,
      participants: { select: { userId: true } },
    },
    take: 10,
  });
  const selected = new Set(input.participantIds);
  return candidates.map((candidate) => {
    const ids = candidate.participants.map((item) => item.userId);
    const exactParticipants =
      ids.length === selected.size && ids.every((id) => selected.has(id));
    return {
      id: candidate.id,
      status: candidate.status,
      confidence:
        candidate.invoiceAmount === input.invoiceAmount && exactParticipants
          ? "HIGH"
          : "MEDIUM",
    };
  });
}

function ensureRequiredFiles(
  files: Array<{ file: File; type: AttachmentType }>,
) {
  if (!files.some((item) => item.type === AttachmentType.INVOICE))
    throw new AppError("VALIDATION_ERROR", "فایل فاکتور الزامی است.", 400, {
      invoice: ["فایل فاکتور الزامی است."],
    });
  if (!files.some((item) => item.type === AttachmentType.PAYMENT_PROOF))
    throw new AppError("VALIDATION_ERROR", "رسید پرداخت الزامی است.", 400, {
      paymentProof: ["رسید پرداخت الزامی است."],
    });
}

export async function validateRequestInput(
  tx: Prisma.TransactionClient,
  input: InvoiceRequestInput,
) {
  const participantIds = [...new Set(input.participantIds)];
  if (participantIds.length !== input.participantIds.length)
    throw new AppError("VALIDATION_ERROR", "فهرست افراد تکراری است.", 400);

  if (input.category === InvoiceCategory.LUNCH) {
    if (!participantIds.length)
      throw new AppError(
        "VALIDATION_ERROR",
        "حداقل یک شرکت‌کننده انتخاب کنید.",
        400,
      );
    const activeCount = await tx.user.count({
      where: { id: { in: participantIds }, isActive: true },
    });
    if (activeCount !== participantIds.length)
      throw new AppError(
        "VALIDATION_ERROR",
        "یک یا چند شرکت‌کننده غیرفعال یا نامعتبر است.",
        400,
      );
  } else if (participantIds.length || !input.title || !input.purchaseCategory) {
    throw new AppError(
      "VALIDATION_ERROR",
      "اطلاعات خرید تخصصی کامل نیست.",
      400,
    );
  }

  const maxSetting = await tx.systemSetting.findUnique({
    where: { key: "invoice.max_amount_toman" },
  });
  if (maxSetting && input.invoiceAmount > BigInt(String(maxSetting.value)))
    throw new AppError(
      "VALIDATION_ERROR",
      "مبلغ فاکتور از سقف مجاز ثبت بیشتر است.",
      400,
    );
  return participantIds;
}

export async function createInvoiceRequest(
  identity: AuthenticatedIdentity,
  input: InvoiceRequestInput,
  files: Array<{ file: File; type: AttachmentType }>,
  audit: AuditContext,
) {
  ensureRequiredFiles(files);
  const duplicates = await findDuplicateRequests(identity.userId, input);
  if (duplicates.length && !input.duplicateConfirmed)
    throw new AppError(
      "DUPLICATE_CONFIRMATION_REQUIRED",
      "فاکتور مشابهی پیدا شد. در صورت متفاوت‌بودن خرید، ثبت مجدد را تأیید کنید.",
      409,
    );

  const requestId = randomUUID();
  const archived = await archiveUploads(files, requestId, input.invoiceDate);
  try {
    return await prisma.$transaction(async (tx) => {
      const participantIds = await validateRequestInput(tx, input);
      const request = await tx.invoiceRequest.create({
        data: {
          id: requestId,
          creatorId: identity.userId,
          category: input.category,
          invoiceDate: input.invoiceDate,
          title: input.title,
          vendorName: input.vendorName,
          purchaseCategory: input.purchaseCategory,
          invoiceAmount: input.invoiceAmount,
          description: input.description,
          duplicateConfirmed: input.duplicateConfirmed,
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
          attachments: {
            create: archived.map((item) => ({
              id: item.id,
              type: item.type,
              storageStatus: StorageStatus.AVAILABLE,
              storageKey: item.storageKey,
              originalName: item.originalName,
              mediaType: item.mediaType,
              byteSize: item.byteSize,
              sha256: item.sha256,
              uploadedById: identity.userId,
            })),
          },
          statusHistory: {
            create: {
              toStatus: InvoiceRequestStatus.PENDING_REVIEW,
              changedById: identity.userId,
            },
          },
        },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "INVOICE_REQUEST_CREATED",
        entity: "InvoiceRequest",
        entityId: request.id,
        metadata: {
          category: input.category,
          duplicateConfirmed: input.duplicateConfirmed,
          participantCount: participantIds.length,
        },
        ...audit,
      });
      return request;
    });
  } catch (error) {
    await removeArchivedUploads(archived);
    throw error;
  }
}

export async function listInvoiceRequests(
  identity: AuthenticatedIdentity,
  options?: {
    status?: InvoiceRequestStatus;
    category?: InvoiceCategory;
    take?: number;
  },
) {
  return prisma.invoiceRequest.findMany({
    where: {
      ...(isFinanceAdmin(identity.role) ? {} : { creatorId: identity.userId }),
      ...(options?.status ? { status: options.status } : {}),
      ...(options?.category ? { category: options.category } : {}),
    },
    include: {
      creator: { select: { id: true, name: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
      payment: true,
      _count: { select: { attachments: true } },
    },
    orderBy: [{ invoiceDate: "desc" }, { createdAt: "desc" }],
    take: Math.min(options?.take ?? 100, 200),
  });
}

export async function getInvoiceRequest(
  identity: AuthenticatedIdentity,
  id: string,
) {
  const request = await prisma.invoiceRequest.findUnique({
    where: { id },
    include: {
      creator: { select: { id: true, name: true, username: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { user: { name: "asc" } },
      },
      attachments: {
        select: {
          id: true,
          type: true,
          originalName: true,
          mediaType: true,
          byteSize: true,
          uploadedAt: true,
          storageStatus: true,
        },
        orderBy: { uploadedAt: "desc" },
      },
      payment: true,
      statusHistory: {
        include: { changedBy: { select: { name: true } } },
        orderBy: { changedAt: "desc" },
      },
    },
  });
  if (!request) throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
  assertCanViewRequest(identity, request.creatorId);
  return request;
}

export async function listActiveParticipants() {
  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, username: true },
    orderBy: [{ name: "asc" }, { username: "asc" }],
  });
}
