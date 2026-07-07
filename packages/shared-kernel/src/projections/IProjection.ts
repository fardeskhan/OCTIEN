import { TenantId } from '../domain/value-objects/TenantId';

export interface ProjectionMetadata {
  projectionId: string;
  projectionVersion: number;
  schemaVersion: number;
  lastProcessedEventId: string;
  lastProcessedEventVersion: number;
  lastProcessedTimestamp: Date;
  checksum: string;
  rebuiltAt: Date | null;
  rebuiltBy: string | null;
  tenantId: TenantId;
}

export interface IProjection<TEvent = any> {
  projectionId(): string;
  projectionName(): string;
  projectionVersion(): number;
  schemaVersion(): number;
  supportedEvents(): string[];
  
  apply(event: TEvent, metadata: ProjectionMetadata): Promise<void>;
  rebuild(events: TEvent[]): Promise<void>;
  
  /**
   * Deterministic checksum calculation over the business state (not just row count).
   */
  checksum(): string;
  
  validate(): boolean;
  
  health(): {
    status: 'Healthy' | 'Degraded' | 'Failed';
    lagMs: number;
    eventsBehind: number;
    errorCount: number;
    lastReplay: Date | null;
    checksum: string;
    schemaVersion: number;
  };
}
