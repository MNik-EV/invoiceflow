import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";
import { prisma } from "@/lib/db/prisma";
import {
  encryptSensitiveValue,
  decryptSensitiveValue,
} from "@/lib/security/encryption";
import { writeAudit } from "@/modules/audit/application/write-audit";
import type { AuthenticatedIdentity } from "@/modules/identity/domain/types";
import type { AuditContext } from "@/modules/invoice-requests/application/requests";
import {
  isValidIranianCard,
  isValidIranianIban,
  maskCard,
  maskIban,
  normalizeCardNumber,
  normalizeIban,
} from "@/modules/users/domain/bank-validation";

export async function getOwnBankProfile(identity: AuthenticatedIdentity) {
  const user = await prisma.user.findUnique({
    where: { id: identity.userId },
    select: {
      bankCardNumberEncrypted: true,
      bankCardLast4: true,
      ibanEncrypted: true,
    },
  });
  if (!user) throw new AppError("NOT_FOUND", "کاربر پیدا نشد.", 404);
  const card = user.bankCardNumberEncrypted
    ? decryptSensitiveValue(user.bankCardNumberEncrypted)
    : null;
  const iban = user.ibanEncrypted
    ? decryptSensitiveValue(user.ibanEncrypted)
    : null;
  return {
    cardNumber: card,
    iban,
    maskedCard: maskCard(card),
    maskedIban: maskIban(iban),
  };
}

export async function updateOwnBankProfile(
  identity: AuthenticatedIdentity,
  input: { cardNumber: string; iban: string },
  audit: AuditContext,
) {
  const cardNumber = normalizeCardNumber(input.cardNumber);
  const iban = normalizeIban(input.iban);
  const fieldErrors: Record<string, string[]> = {};
  if (!isValidIranianCard(cardNumber))
    fieldErrors.cardNumber = ["شماره کارت بانکی معتبر نیست."];
  if (!isValidIranianIban(iban))
    fieldErrors.iban = ["شماره شبای بانکی معتبر نیست."];
  if (Object.keys(fieldErrors).length)
    throw new AppError(
      "VALIDATION_ERROR",
      "اطلاعات بانکی معتبر نیست.",
      400,
      fieldErrors,
    );
  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: identity.userId },
      data: {
        bankCardNumberEncrypted: encryptSensitiveValue(cardNumber),
        bankCardLast4: cardNumber.slice(-4),
        ibanEncrypted: encryptSensitiveValue(iban),
        encryptionKeyId: getEnv().BANK_ENCRYPTION_KEY_ID,
      },
    });
    await writeAudit(tx, {
      userId: identity.userId,
      action: "BANK_PROFILE_CHANGED",
      entity: "User",
      entityId: identity.userId,
      metadata: { changedFields: ["bankCardNumber", "iban"] },
      ...audit,
    });
  });
  return { success: true };
}

export async function getPayeeBankProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, bankCardNumberEncrypted: true, ibanEncrypted: true },
  });
  if (!user) throw new AppError("NOT_FOUND", "کاربر پیدا نشد.", 404);
  return {
    name: user.name,
    cardNumber: user.bankCardNumberEncrypted
      ? decryptSensitiveValue(user.bankCardNumberEncrypted)
      : null,
    iban: user.ibanEncrypted ? decryptSensitiveValue(user.ibanEncrypted) : null,
  };
}
