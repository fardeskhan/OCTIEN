
/// <reference types="node" />
import * as fs from "fs/promises";
import * as path from "path";
import * as crypto from "crypto";

export interface StorageProvider {
  /**
   * Uploads a file to the storage backend.
   * Returns a unique storage URL/key.
   */
  upload(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string>;

  /**
   * Retrieves the download URL or stream for a given storage key.
   */
  getDownloadUrl(storageUrl: string): Promise<string>;
}

export class LocalStorageProvider implements StorageProvider {
  private readonly storageDir = path.join(process.cwd(), "tmp", "attachments");

  constructor() {
    // Ensure the storage directory exists
    fs.mkdir(this.storageDir, { recursive: true }).catch(console.error);
  }

  async upload(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const ext = path.extname(fileName);
    const uniqueName = crypto.randomUUID() + ext;
    const destPath = path.join(this.storageDir, uniqueName);
    
    await fs.writeFile(destPath, fileBuffer);
    
    return uniqueName;
  }

  async getDownloadUrl(storageUrl: string): Promise<string> {
    // In a real local provider, we might return a route like `/api/documents/download?id=storageUrl`
    return `/api/documents/download/${storageUrl}`;
  }
}

