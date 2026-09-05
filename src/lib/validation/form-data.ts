import { AppError } from "@/lib/errors/app-error";
import { getEnv } from "@/lib/env";

export function assertUploadBodySize(request: Request, fileSlots = 3): void {
  const contentLength = Number(request.headers.get("content-length"));
  const maximum = getEnv().UPLOAD_MAX_FILE_BYTES * fileSlots + 1_048_576;
  if (Number.isFinite(contentLength) && contentLength > maximum) {
    throw new AppError(
      "FILE_VALIDATION_FAILED",
      "حجم مجموع فایل‌های ارسالی بیش از حد مجاز است.",
      413,
    );
  }
}

export function stringField(form: FormData, key: string): string {
  const value = form.get(key);
  if (typeof value !== "string")
    throw new AppError("VALIDATION_ERROR", "اطلاعات فرم کامل نیست.", 400, {
      [key]: ["این فیلد الزامی است."],
    });
  return value;
}

export function optionalStringField(
  form: FormData,
  key: string,
): string | undefined {
  const value = form.get(key);
  return typeof value === "string" ? value : undefined;
}

export function fileField(form: FormData, key: string): File | null {
  const value = form.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}
