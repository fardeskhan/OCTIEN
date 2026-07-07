export interface IFinancialConnectivity {
  /**
   * Retrieves securely rotated credentials from the Vault and injects them 
   * securely into the runtime adapter execution context without exposing them to the domain.
   */
  executeAdapter<T>(
    adapterId: string, 
    credentialReferenceId: string, 
    operation: string, 
    payload: any
  ): Promise<T>;

  verifyWebhookSignature(adapterId: string, signature: string, payload: string): Promise<boolean>;

  checkRateLimit(adapterId: string, tenantId: string): Promise<{ allowed: boolean; retryAfterMs?: number }>;
}
