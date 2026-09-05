import { normalizeDigits } from "@/lib/i18n/numbers";

export function normalizeCardNumber(value: string): string {
  return normalizeDigits(value).replace(/[\s-]/g, "");
}

export function isValidIranianCard(value: string): boolean {
  const card = normalizeCardNumber(value);
  if (!/^\d{16}$/.test(card) || /^(\d)\1{15}$/.test(card)) return false;
  const sum = [...card].reduce((total, digit, index) => {
    const multiplier = index % 2 === 0 ? 2 : 1;
    const product = Number(digit) * multiplier;
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return sum % 10 === 0;
}

export function normalizeIban(value: string): string {
  const normalized = normalizeDigits(value).replace(/[\s-]/g, "").toUpperCase();
  return normalized.startsWith("IR") ? normalized : `IR${normalized}`;
}

export function isValidIranianIban(value: string): boolean {
  const iban = normalizeIban(value);
  if (!/^IR\d{24}$/.test(iban)) return false;
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`.replace(
    /[A-Z]/g,
    (letter) => String(letter.charCodeAt(0) - 55),
  );
  let remainder = 0;
  for (const digit of rearranged)
    remainder = (remainder * 10 + Number(digit)) % 97;
  return remainder === 1;
}

export function maskCard(card: string | null): string | null {
  if (!card) return null;
  return `****-****-****-${card.slice(-4)}`;
}

export function maskIban(iban: string | null): string | null {
  if (!iban) return null;
  return `IR** **** **** **** **** **${iban.slice(-4)}`;
}
