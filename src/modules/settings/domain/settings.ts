import { AppError } from "@/lib/errors/app-error";

export const SETTING_DEFINITIONS = {
  "lunch.allowance_toman": {
    label: "سهمیه ناهار (تومان)",
    min: 1n,
    max: 100_000_000n,
  },
  "invoice.max_amount_toman": {
    label: "سقف ثبت فاکتور (تومان)",
    min: 1n,
    max: 100_000_000_000n,
  },
} as const;

export type EditableSettingKey = keyof typeof SETTING_DEFINITIONS;

export function validateSettingValue(
  key: string,
  value: string,
): { key: EditableSettingKey; value: string } {
  if (!(key in SETTING_DEFINITIONS))
    throw new AppError("NOT_FOUND", "تنظیم موردنظر پیدا نشد.", 404);
  if (!/^\d+$/.test(value))
    throw new AppError(
      "VALIDATION_ERROR",
      "مقدار تنظیم باید عدد صحیح مثبت باشد.",
      400,
    );
  const definition = SETTING_DEFINITIONS[key as EditableSettingKey];
  const numeric = BigInt(value);
  if (numeric < definition.min || numeric > definition.max)
    throw new AppError(
      "VALIDATION_ERROR",
      "مقدار تنظیم خارج از محدوده مجاز است.",
      400,
    );
  return { key: key as EditableSettingKey, value: numeric.toString() };
}
