import path from "node:path";
import { randomUUID } from "node:crypto";

import { AttachmentType } from "@prisma/client";

import { formatJalaliDate } from "@/lib/i18n/date";
import { getDocumentStorage } from "@/modules/attachments/infrastructure/local-document-storage";
import { validateUpload } from "@/modules/attachments/application/validate-upload";

const category: Record<AttachmentType, string> = {
  INVOICE: "invoices",
  PAYMENT_PROOF: "receipts",
  FOOD_IMAGE: "food-images",
  SUPPORTING_DOCUMENT: "supporting-documents",
};

export interface ArchivedUpload {
  id: string;
  type: AttachmentType;
  storageKey: string;
  originalName: string;
  mediaType: string;
  byteSize: bigint;
  sha256: string;
}

export async function archiveUploads(
  files: Array<{ file: File; type: AttachmentType }>,
  requestId: string,
  invoiceDate: Date,
): Promise<ArchivedUpload[]> {
  const storage = getDocumentStorage();
  const jalaliParts = formatJalaliDate(invoiceDate).split("/");
  const archived: ArchivedUpload[] = [];
  const staged: string[] = [];
  try {
    for (const item of files) {
      const validated = await validateUpload(item.file, item.type);
      const stage = await storage.putStaged(validated);
      staged.push(stage.key);
      const id = randomUUID();
      const storageKey = path.posix.join(
        category[item.type],
        jalaliParts[0]!,
        jalaliParts[1]!,
        requestId,
        `${id}.${validated.extension}`,
      );
      await storage.promote(stage.key, storageKey);
      staged.splice(staged.indexOf(stage.key), 1);
      archived.push({
        id,
        type: validated.type,
        storageKey,
        originalName: validated.originalName,
        mediaType: validated.mediaType,
        byteSize: validated.byteSize,
        sha256: validated.sha256,
      });
    }
    return archived;
  } catch (error) {
    await Promise.allSettled(
      [...staged, ...archived.map((item) => item.storageKey)].map((key) =>
        storage.remove(key),
      ),
    );
    throw error;
  }
}

export async function removeArchivedUploads(
  items: ArchivedUpload[],
): Promise<void> {
  const storage = getDocumentStorage();
  await Promise.allSettled(
    items.map((item) => storage.remove(item.storageKey)),
  );
}
