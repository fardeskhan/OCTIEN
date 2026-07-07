/**
 * BaseProjection
 * All read models in COSMY MUST implement this interface to guarantee
 * 100% deterministic replayability and detect silent schema corruption.
 */
export interface BaseProjection {
  tenantId: string;
  projectionVersion: number;
  schemaVersion: string;
  sourceEventVersion: number;
  rebuiltAt: Date;
  
  // A hash computed from the projection state to immediately flag replay inconsistencies
  projectionChecksum: string; 
}
