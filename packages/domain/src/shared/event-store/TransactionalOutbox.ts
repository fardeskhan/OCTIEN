export interface OutboxMessage {
  id: string;
  eventType: string;
  payload: string; // JSON serialized DomainEvent
  createdAt: Date;
  processedAt: Date | null;
}

export interface TransactionalOutbox {
  insert(messages: OutboxMessage[], transactionClient: any): Promise<void>;
  markProcessed(messageId: string): Promise<void>;
  fetchUnprocessed(): Promise<OutboxMessage[]>;
}
