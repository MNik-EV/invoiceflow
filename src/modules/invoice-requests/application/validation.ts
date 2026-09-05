import { InvoiceCategory, LabPurchaseCategory } from "@prisma/client";
import { z } from "zod";

import { jalaliToDatabaseDate } from "@/lib/i18n/date";
import { parseToman } from "@/lib/i18n/numbers";

const optionalText = (max: number) =>
  z.preprocess(
    (value) => (value === "" || value === undefined ? null : value),
    z.string().trim().max(max).nullable(),
  );

export const requestInputSchema = z
  .object({
    category: z.nativeEnum(InvoiceCategory),
    invoiceDate: z
      .string()
      .trim()
      .min(8)
      .max(10)
      .transform((value, context) => {
        try {
          return jalaliToDatabaseDate(value);
        } catch {
          context.addIssue({ code: "custom", message: "تاریخ معتبر نیست." });
          return z.NEVER;
        }
      }),
    title: optionalText(200),
    vendorName: optionalText(200),
    purchaseCategory: z.preprocess(
      (value) => (value === "" || value === undefined ? null : value),
      z.nativeEnum(LabPurchaseCategory).nullable(),
    ),
    participantIds: z.array(z.string().uuid()).max(100).default([]),
    invoiceAmount: z.string().transform((value, context) => {
      try {
        const amount = parseToman(value);
        if (amount <= 0n) throw new Error();
        return amount;
      } catch {
        context.addIssue({
          code: "custom",
          message: "مبلغ فاکتور معتبر نیست.",
        });
        return z.NEVER;
      }
    }),
    description: optionalText(2000),
    duplicateConfirmed: z.boolean().default(false),
  })
  .superRefine((value, context) => {
    if (value.category === InvoiceCategory.LUNCH) {
      if (value.participantIds.length < 1)
        context.addIssue({
          code: "custom",
          path: ["participantIds"],
          message: "حداقل یک شرکت‌کننده انتخاب کنید.",
        });
      if (value.purchaseCategory)
        context.addIssue({
          code: "custom",
          path: ["purchaseCategory"],
          message: "دسته خرید برای فاکتور ناهار مجاز نیست.",
        });
    } else {
      if (!value.title)
        context.addIssue({
          code: "custom",
          path: ["title"],
          message: "عنوان خرید الزامی است.",
        });
      if (!value.purchaseCategory)
        context.addIssue({
          code: "custom",
          path: ["purchaseCategory"],
          message: "دسته خرید را انتخاب کنید.",
        });
      if (value.participantIds.length)
        context.addIssue({
          code: "custom",
          path: ["participantIds"],
          message: "شرکت‌کننده فقط برای ناهار قابل ثبت است.",
        });
    }
  });

export const duplicateInputSchema = requestInputSchema;
