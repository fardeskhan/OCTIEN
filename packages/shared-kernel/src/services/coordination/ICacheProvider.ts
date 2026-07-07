export interface ICacheProvider {
  /**
   * Retrieves a cached projection or data model.
   * Keys: 'cache:projection:dashboard:tenantId'
   */
  get<T>(key: string): Promise<T | null>;

  /**
   * Sets a value in the cache with an explicit TTL.
   * NEVER cache Aggregates, Domain Events, or Commands here.
   */
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;

  /**
   * Explicitly evicts a key from the cache.
   */
  evict(key: string): Promise<void>;

  /**
   * Evicts all keys matching a specific pattern (e.g. invalidating all tenant read models after a major change).
   */
  evictByPattern(pattern: string): Promise<void>;

  /**
   * Emits telemetry metrics for the caching layer.
   */
  metrics(): Promise<{
    hitRatio: number;
    missRatio: number;
    evictions: number;
    memoryUsageMb: number;
  }>;
}
