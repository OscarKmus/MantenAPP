import * as fs from "fs";
import * as path from "path";
import { randomUUID } from "crypto";
import type { StorageProvider, StorageResult } from "./storage.provider";

const STORAGE_ROOT = path.resolve(process.cwd(), "storage");

export class LocalStorageProvider implements StorageProvider {
  /**
   * Store a file under storage/{subdir}/{YYYY}/{MM}/{uuid}.{ext}
   */
  async put(buffer: Buffer, mimeType: string, ext: string, subdir: string = "attachments"): Promise<StorageResult> {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, "0");
    const filename = `${randomUUID()}.${ext}`;

    const relativePath = path.join(subdir, year, month, filename);
    const fullPath = path.join(STORAGE_ROOT, relativePath);

    // Ensure directory exists
    await fs.promises.mkdir(path.dirname(fullPath), { recursive: true });

    // Write file
    await fs.promises.writeFile(fullPath, buffer);

    return {
      storagePath: relativePath,
      url: `/api/files/${relativePath}`,
    };
  }

  /**
   * Delete a file by its storage path (relative to storage root).
   */
  async delete(storagePath: string): Promise<void> {
    const fullPath = this.resolvePath(storagePath);
    try {
      await fs.promises.unlink(fullPath);
    } catch (err: any) {
      if (err.code !== "ENOENT") {
        throw err;
      }
      // File already deleted — no-op
    }
  }

  /**
   * Get a readable stream for a file.
   */
  async getReadStream(storagePath: string): Promise<NodeJS.ReadableStream> {
    const fullPath = this.resolvePath(storagePath);
    // Verify file exists
    await fs.promises.access(fullPath, fs.constants.R_OK);
    return fs.createReadStream(fullPath);
  }

  /**
   * Check if a file exists.
   */
  async exists(storagePath: string): Promise<boolean> {
    const fullPath = this.resolvePath(storagePath);
    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Resolve a storage path to an absolute filesystem path.
   * CRITICAL: validates the path doesn't escape the storage root (path traversal prevention).
   */
  resolvePath(storagePath: string): string {
    // Normalize and resolve
    const normalized = path.normalize(storagePath);
    const fullPath = path.resolve(STORAGE_ROOT, normalized);

    // Security: ensure the resolved path is under the storage root
    if (!fullPath.startsWith(STORAGE_ROOT)) {
      throw new Error("Invalid storage path: path traversal detected");
    }

    return fullPath;
  }
}

// Singleton instance
export const localStorage = new LocalStorageProvider();
