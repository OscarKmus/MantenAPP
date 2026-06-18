export interface StorageResult {
  storagePath: string;
  url: string;
}

export interface StorageProvider {
  /**
   * Store a file buffer and return the storage path + serving URL.
   */
  put(buffer: Buffer, mimeType: string, ext: string): Promise<StorageResult>;

  /**
   * Delete a file by its storage path.
   */
  delete(storagePath: string): Promise<void>;

  /**
   * Get a readable stream for a file by its storage path.
   */
  getReadStream(storagePath: string): Promise<NodeJS.ReadableStream>;

  /**
   * Check if a file exists at the given storage path.
   */
  exists(storagePath: string): Promise<boolean>;
}
