import { createHash } from "node:crypto";

import { AttachmentType } from "@prisma/client";
import { fileTypeFromBuffer } from "file-type";

import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";
import type { ValidatedUpload } from "@/modules/attachments/domain/types";

const imageTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function validateUpload(
  file: File,
  type: AttachmentType,
): Promise<ValidatedUpload> {
  const env = getEnv();
  if (file.size <= 0 || file.size > env.UPLOAD_MAX_FILE_BYTES) {
    throw new AppError(
      "FILE_VALIDATION_FAILED",
      `حجم فایل باید کمتر از ${Math.floor(env.UPLOAD_MAX_FILE_BYTES / 1_048_576)} مگابایت باشد.`,
      400,
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(bytes);
  const allowed = new Map(imageTypes);
  if (type !== AttachmentType.FOOD_IMAGE) allowed.set("application/pdf", "pdf");
  if (!detected || !allowed.has(detected.mime)) {
    throw new AppError(
      "FILE_VALIDATION_FAILED",
      "نوع واقعی فایل مجاز نیست. از تصویر JPG، PNG، WebP یا PDF استفاده کنید.",
      400,
    );
  }
  if (
    type === AttachmentType.FOOD_IMAGE &&
    !detected.mime.startsWith("image/")
  ) {
    throw new AppError(
      "FILE_VALIDATION_FAILED",
      "تصویر غذا باید یک فایل تصویری معتبر باشد.",
      400,
    );
  }

  const originalName =
    file.name.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 255) || "document";
  return {
    type,
    originalName,
    mediaType: detected.mime,
    extension: allowed.get(detected.mime)!,
    byteSize: BigInt(bytes.length),
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bytes,
  };
}
