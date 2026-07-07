import { ProjectionMetadata } from './IProjection';

export interface IProjectionRepository<TProjection> {
  save(projection: TProjection, metadata: ProjectionMetadata): Promise<void>;
  load(tenantId: string, id: string): Promise<TProjection | null>;
  rebuild(tenantId: string, projections: TProjection[], metadata: ProjectionMetadata): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
  
  /**
   * Deterministic checksum generated across all materialized view records.
   */
  checksum(tenantId: string): Promise<string>;
  
  /**
   * Validates structural integrity and constraints.
   */
  validate(tenantId: string): Promise<boolean>;
  
  metadata(tenantId: string, projectionId: string): Promise<ProjectionMetadata | null>;
  health(): Promise<{ status: 'Healthy' | 'Degraded' | 'Failed'; connectionLatency: number }>;
}
