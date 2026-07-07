export interface ILockManager {
  /**
   * Acquires a distributed lease-based lock for a specific resource.
   * e.g., 'lock:bank:tenantId:connectionId:sync'
   */
  acquire(key: string, ttlMs: number, ownerId: string): Promise<boolean>;

  /**
   * Renews the TTL of an actively held lock.
   */
  renew(key: string, extensionMs: number, ownerId: string): Promise<boolean>;

  /**
   * Releases the lock, allowing other workers to acquire it.
   */
  release(key: string, ownerId: string): Promise<void>;

  /**
   * Checks if the resource is currently locked without attempting to acquire it.
   */
  isLocked(key: string): Promise<boolean>;

  /**
   * Identifies the current owner (worker/process) of the lock.
   */
  getOwner(key: string): Promise<string | null>;
}
