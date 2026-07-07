export interface AccountingDocumentReference {
  documentId: string;
  documentType: string;
  capability: string; // e.g., 'CAP-SALES'
  aggregateType: string; // e.g., 'Invoice'
  aggregateId: string;
  version: string;
  hash: string;
  number?: string;
  createdAt: string; // ISO-8601 UTC
}
