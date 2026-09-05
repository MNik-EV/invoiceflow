const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(persianDigits.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

export function parseToman(value: string): bigint {
  const normalized = normalizeDigits(value).replace(/[,_٬،\s]/g, "");
  if (!/^\d+$/.test(normalized)) throw new Error("INVALID_AMOUNT");
  return BigInt(normalized);
}

export function formatToman(value: bigint | number | string): string {
  return `${new Intl.NumberFormat("fa-IR").format(BigInt(value))} تومان`;
}

export function toPersianNumber(value: number | bigint | string): string {
  return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(
    BigInt(value),
  );
}
