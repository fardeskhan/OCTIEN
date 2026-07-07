export interface IIdempotencyStore {
  /**
   * Registers an operation explicitly as pending/processing.
   * Key pattern: 'idempotency:capability:hash'
   */
  register(hashKey: string, ttlMs: number): Promise<boolean>;

  /**
   * Checks if an operation has already been processed or is currently processing.
   */
  exists(hashKey: string): Promise<boolean>;

  /**
   * Removes an idempotency record (typically only if an operation structurally failed and must retry).
   */
  remove(hashKey: string): Promise<void>;

  /**
   * Returns operational telemetry for caching metrics and deduplication rates.
   */
  health(): Promise<{
    duplicateDetections: number;
    storeSize: number;
    lookupLatencyMs: number;
  }>;
}
