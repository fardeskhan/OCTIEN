export interface DocumentGenerationRequest {
  templateId: string;
  dataPayload: any;
  format: 'PDF' | 'DOCX' | 'XLSX';
  watermark?: string;
}

export interface DocumentStatus {
  documentId: string;
  status: 'Queued' | 'Generating' | 'Completed' | 'Failed';
  downloadUrl?: string;
  expiresAt?: Date;
}

/**
 * Strict Document Service Contract.
 * Guarantees all documents across Finance, Sales, HR, and Inventory
 * are managed exactly the same way without direct module coupling.
 */
export interface DocumentService {
  generateDocument(request: DocumentGenerationRequest): Promise<string>; // Returns documentId
  previewDocument(request: DocumentGenerationRequest): Promise<string>;  // Sync generation, throws if too large
  archiveDocument(documentId: string, vaultId: string): Promise<void>;
  getStatus(documentId: string): Promise<DocumentStatus>;
}
