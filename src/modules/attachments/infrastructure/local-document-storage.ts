import { mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { getEnv } from "@/lib/env";
import type {
  DocumentStorage,
  StagedObject,
  ValidatedUpload,
} from "@/modules/attachments/domain/types";

export class LocalDocumentStorage implements DocumentStorage {
  private readonly root = path.resolve(getEnv().STORAGE_ROOT);

  private resolveSafe(key: string): string {
    const resolved = path.resolve(this.root, key);
    if (
      resolved !== this.root &&
      !resolved.startsWith(`${this.root}${path.sep}`)
    ) {
      throw new Error("Unsafe storage key");
    }
    return resolved;
  }

  async putStaged(upload: ValidatedUpload): Promise<StagedObject> {
    const key = path.posix.join(
      ".staging",
      `${randomUUID()}.${upload.extension}`,
    );
    const target = this.resolveSafe(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, upload.bytes, { flag: "wx", mode: 0o600 });
    return { key };
  }

  async promote(stagedKey: string, permanentKey: string): Promise<void> {
    const source = this.resolveSafe(stagedKey);
    const target = this.resolveSafe(permanentKey);
    await mkdir(path.dirname(target), { recursive: true });
    await rename(source, target);
  }

  read(permanentKey: string): Promise<Buffer> {
    return readFile(this.resolveSafe(permanentKey));
  }

  async remove(key: string): Promise<void> {
    await rm(this.resolveSafe(key), { force: true });
  }

  async exists(key: string): Promise<boolean> {
    return stat(this.resolveSafe(key))
      .then(() => true)
      .catch(() => false);
  }
}

let storage: DocumentStorage | undefined;

export function getDocumentStorage(): DocumentStorage {
  if (storage) return storage;
  if (getEnv().STORAGE_DRIVER !== "local") {
    throw new Error(
      "The configured document storage driver is not available in this deployment",
    );
  }
  storage = new LocalDocumentStorage();
  return storage;
}
