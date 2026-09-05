import type { AttachmentType } from "@prisma/client";

export interface ValidatedUpload {
  type: AttachmentType;
  originalName: string;
  mediaType: string;
  extension: string;
  byteSize: bigint;
  sha256: string;
  bytes: Buffer;
}

export interface StagedObject {
  key: string;
}

export interface DocumentStorage {
  putStaged(upload: ValidatedUpload): Promise<StagedObject>;
  promote(stagedKey: string, permanentKey: string): Promise<void>;
  read(permanentKey: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
