
import { PrismaClient, DocumentSourceType, DocumentStatus } from "@prisma/client";
import { StorageProvider, LocalStorageProvider } from "./storage-provider";
import * as crypto from "crypto";

const db = new PrismaClient();

const CATEGORY_LIMITS: Record<string, number> = {
  "image/png": 10 * 1024 * 1024,
  "image/jpeg": 10 * 1024 * 1024,
  "image/webp": 10 * 1024 * 1024,
  "application/pdf": 25 * 1024 * 1024,
  "application/vnd.ms-excel": 15 * 1024 * 1024,
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 15 * 1024 * 1024,
  "text/csv": 15 * 1024 * 1024,
};

const HARD_LIMIT = 25 * 1024 * 1024;

export class DocumentService {
  private static storage: StorageProvider = new LocalStorageProvider();

  /**
   * Uploads and attaches a new document. Includes validation and checksum duplicate detection.
   */
  static async uploadDocument(
    businessId: string,
    tenantId: string,
    userId: string,
    sourceType: DocumentSourceType,
    sourceId: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string
  ) {
    // 1. Validate MIME Type
    if (!(mimeType in CATEGORY_LIMITS)) {
      throw new Error(`Invalid MIME Type: ${mimeType} is not allowed.`);
    }

    // 2. Validate Size
    const sizeBytes = fileBuffer.length;
    if (sizeBytes > HARD_LIMIT || sizeBytes > CATEGORY_LIMITS[mimeType]) {
      throw new Error(`File size ${sizeBytes} exceeds the limit for ${mimeType}.`);
    }

    // 3. Checksum logic for duplication detection
    const checksum = crypto.createHash("md5").update(fileBuffer).digest("hex");

    // Retrieve active documents for this source
    const existingDocs = await db.documentAttachment.findMany({
      where: { businessId, sourceType, sourceId, status: "ACTIVE" }
    });

    for (const doc of existingDocs) {
      if (doc.checksum === checksum) {
        throw new Error(`Duplicate document detected (checksum match).`);
      }
    }

    // Determine new version (max active version + 1)
    const currentMaxVersion = existingDocs.reduce((max, doc) => Math.max(max, doc.version), 0);
    const newVersion = currentMaxVersion + 1;

    // 4. Supersede logic: If this is an exact replacement (e.g. same name), mark old as SUPERSEDED.
    // For general attachments, multiple active files are allowed, but if we wanted to replace an existing "Bill Scan",
    // we would supersede the old one. We will assume for this API that any new upload with the SAME fileName supersedes the old one.
    const supersededDocs = existingDocs.filter(d => d.fileName === fileName);
    
    // 5. Upload via provider
    const storageUrl = await this.storage.upload(fileBuffer, fileName, mimeType);

    // 6. Database Transaction
    const newDoc = await db.$transaction(async (tx) => {
      // Supersede old ones
      if (supersededDocs.length > 0) {
        await tx.documentAttachment.updateMany({
          where: { id: { in: supersededDocs.map(d => d.id) } },
          data: { status: "SUPERSEDED" }
        });
      }

      // Create new one
      return await tx.documentAttachment.create({
        data: {
          businessId,
          tenantId,
          sourceType,
          sourceId,
          fileName,
          mimeType,
          sizeBytes,
          checksum,
          version: newVersion,
          storageUrl,
          uploadedBy: userId,
          status: "ACTIVE"
        }
      });
    });

    return newDoc;
  }

  static async getAttachments(businessId: string, sourceType: DocumentSourceType, sourceId: string) {
    const docs = await db.documentAttachment.findMany({
      where: { businessId, sourceType, sourceId, status: "ACTIVE" },
      orderBy: { uploadedAt: "desc" }
    });

    // Resolve URLs
    return Promise.all(docs.map(async (doc) => ({
      ...doc,
      downloadUrl: await this.storage.getDownloadUrl(doc.storageUrl)
    })));
  }

  static async getAttachmentCount(businessId: string, sourceType: DocumentSourceType, sourceId: string) {
    return await db.documentAttachment.count({
      where: { businessId, sourceType, sourceId, status: "ACTIVE" }
    });
  }

  static async deleteAttachment(id: string) {
    // Immutable Audit Evidence
    throw new Error("Immutable storage violation: Attachments cannot be deleted. They may only be superseded by uploading a newer version.");
  }
}

