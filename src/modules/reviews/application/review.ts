import { InvoiceCategory, InvoiceRequestStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { writeAudit } from "@/modules/audit/application/write-audit";
import {
  ADMIN_ROLES,
  requireRole,
} from "@/modules/identity/domain/permissions";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type { AuditContext } from "@/modules/invoice-requests/application/requests";
import {
  assertRequestTransition,
  calculateApprovedAmount,
} from "@/modules/invoice-requests/domain/policy";

export async function approveRequest(
  identity: AuthenticatedIdentity,
  requestId: string,
  expectedVersion: number,
  audit: AuditContext,
) {
  requireRole(identity, ADMIN_ROLES);
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.invoiceRequest.findUnique({
        where: { id: requestId },
        include: {
          _count: { select: { participants: true } },
          attachments: { select: { type: true, storageStatus: true } },
        },
      });
      if (!request) throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
      assertRequestTransition(request.status, InvoiceRequestStatus.APPROVED);
      const hasInvoice = request.attachments.some(
        (item) => item.type === "INVOICE" && item.storageStatus === "AVAILABLE",
      );
      const hasReceipt = request.attachments.some(
        (item) =>
          item.type === "PAYMENT_PROOF" && item.storageStatus === "AVAILABLE",
      );
      if (
        !hasInvoice ||
        !hasReceipt ||
        (request.category === InvoiceCategory.LUNCH &&
          request._count.participants < 1)
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "مدارک یا اطلاعات درخواست کامل نیست.",
          400,
        );

      const allowanceSetting =
        request.category === InvoiceCategory.LUNCH
          ? await tx.systemSetting.findUnique({
              where: { key: "lunch.allowance_toman" },
            })
          : null;
      const allowance = allowanceSetting
        ? BigInt(String(allowanceSetting.value))
        : undefined;
      const calculatedAmount = calculateApprovedAmount({
        category: request.category,
        invoiceAmount: request.invoiceAmount,
        participantCount: request._count.participants,
        lunchAllowance: allowance,
      });
      const updated = await tx.invoiceRequest.updateMany({
        where: {
          id: requestId,
          status: InvoiceRequestStatus.PENDING_REVIEW,
          version: expectedVersion,
        },
        data: {
          status: InvoiceRequestStatus.APPROVED,
          allowancePerParticipant: allowance ?? null,
          approvedParticipantCount:
            request.category === InvoiceCategory.LUNCH
              ? request._count.participants
              : null,
          calculatedAmount,
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
      await tx.requestStatusHistory.create({
        data: {
          requestId,
          fromStatus: request.status,
          toStatus: InvoiceRequestStatus.APPROVED,
          changedById: identity.userId,
          metadata: {
            category: request.category,
            allowance: allowance?.toString() ?? null,
            calculatedAmount: calculatedAmount.toString(),
          },
        },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "INVOICE_REQUEST_APPROVED",
        entity: "InvoiceRequest",
        entityId: requestId,
        metadata: {
          category: request.category,
          allowance: allowance?.toString() ?? null,
          calculatedAmount: calculatedAmount.toString(),
          participantCount: request._count.participants,
        },
        ...audit,
      });
      return { calculatedAmount };
    },
    { isolationLevel: "Serializable" },
  );
}

export async function rejectRequest(
  identity: AuthenticatedIdentity,
  requestId: string,
  expectedVersion: number,
  reason: string,
  audit: AuditContext,
) {
  requireRole(identity, ADMIN_ROLES);
  const normalizedReason = reason.trim();
  if (normalizedReason.length < 3 || normalizedReason.length > 1000)
    throw new AppError(
      "VALIDATION_ERROR",
      "دلیل رد باید حداقل ۳ و حداکثر ۱۰۰۰ نویسه باشد.",
      400,
    );
  return prisma.$transaction(async (tx) => {
    const request = await tx.invoiceRequest.findUnique({
      where: { id: requestId },
    });
    if (!request) throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
    assertRequestTransition(request.status, InvoiceRequestStatus.REJECTED);
    const updated = await tx.invoiceRequest.updateMany({
      where: {
        id: requestId,
        status: InvoiceRequestStatus.PENDING_REVIEW,
        version: expectedVersion,
      },
      data: {
        status: InvoiceRequestStatus.REJECTED,
        rejectionReason: normalizedReason,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1)
      throw new AppError(
        "CONFLICT",
        "درخواست هم‌زمان تغییر کرده است. صفحه را تازه کنید.",
        409,
      );
    await tx.requestStatusHistory.create({
      data: {
        requestId,
        fromStatus: request.status,
        toStatus: InvoiceRequestStatus.REJECTED,
        changedById: identity.userId,
        reason: normalizedReason,
      },
    });
    await writeAudit(tx, {
      userId: identity.userId,
      action: "INVOICE_REQUEST_REJECTED",
      entity: "InvoiceRequest",
      entityId: requestId,
      metadata: { reason: normalizedReason, category: request.category },
      ...audit,
    });
    return { success: true };
  });
}

export async function recordPayment(
  identity: AuthenticatedIdentity,
  input: {
    requestId: string;
    expectedVersion: number;
    amount: bigint;
    paidOn: Date;
    trackingCode: string;
  },
  audit: AuditContext,
) {
  requireRole(identity, ADMIN_ROLES);
  const trackingCode = input.trackingCode.trim();
  if (!trackingCode || trackingCode.length > 120)
    throw new AppError("VALIDATION_ERROR", "شماره پیگیری معتبر نیست.", 400);
  return prisma.$transaction(
    async (tx) => {
      const request = await tx.invoiceRequest.findUnique({
        where: { id: input.requestId },
        include: {
          creator: {
            select: { bankCardNumberEncrypted: true, ibanEncrypted: true },
          },
        },
      });
      if (!request) throw new AppError("NOT_FOUND", "درخواست پیدا نشد.", 404);
      assertRequestTransition(request.status, InvoiceRequestStatus.PAID);
      if (
        !request.creator.bankCardNumberEncrypted ||
        !request.creator.ibanEncrypted
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "اطلاعات بانکی دریافت‌کننده کامل نیست.",
          400,
        );
      if (
        request.calculatedAmount === null ||
        request.calculatedAmount !== input.amount
      )
        throw new AppError(
          "VALIDATION_ERROR",
          "مبلغ پرداخت باید دقیقاً برابر مبلغ تأییدشده باشد.",
          400,
        );
      const updated = await tx.invoiceRequest.updateMany({
        where: {
          id: input.requestId,
          status: InvoiceRequestStatus.APPROVED,
          version: input.expectedVersion,
        },
        data: {
          status: InvoiceRequestStatus.PAID,
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1)
        throw new AppError(
          "CONFLICT",
          "درخواست هم‌زمان تغییر کرده یا قبلاً پرداخت شده است.",
          409,
        );
      const payment = await tx.payment.create({
        data: {
          requestId: input.requestId,
          amount: input.amount,
          paidById: identity.userId,
          paidOn: input.paidOn,
          trackingCode,
        },
      });
      await tx.requestStatusHistory.create({
        data: {
          requestId: input.requestId,
          fromStatus: request.status,
          toStatus: InvoiceRequestStatus.PAID,
          changedById: identity.userId,
          metadata: { paymentId: payment.id, trackingCode },
        },
      });
      await writeAudit(tx, {
        userId: identity.userId,
        action: "PAYMENT_RECORDED",
        entity: "Payment",
        entityId: payment.id,
        metadata: {
          requestId: input.requestId,
          category: request.category,
          amount: input.amount.toString(),
          paidOn: input.paidOn.toISOString().slice(0, 10),
          trackingCode,
        },
        ...audit,
      });
      return payment;
    },
    { isolationLevel: "Serializable" },
  );
}
