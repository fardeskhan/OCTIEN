export interface AccountingIntegrationEvent {
  eventId: string;
  sourceEventId: string; // Idempotency Key
  tenantId: string;
  subledger: string; // 'AR', 'AP', etc
  transactionType: string; // 'SALE', 'PAYMENT', etc
  sourceDocumentId: string;
  amount: string;
  currency: string;
  postingDate: string;
}
