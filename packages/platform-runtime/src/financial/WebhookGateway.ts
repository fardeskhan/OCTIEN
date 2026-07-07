export interface WebhookPayload {
  adapterId: string;
  rawBody: string;
  signature: string;
  timestamp: string;
}

export interface WebhookGateway {
  /**
   * 1. Signature Validation
   * 2. Replay Check
   * 3. Timestamp Validation
   * 4. Publish Event
   */
  processWebhook(payload: WebhookPayload): Promise<void>;
}
