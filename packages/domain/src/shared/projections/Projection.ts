import { DomainEvent } from '../DomainEvent';

export interface ProjectionCheckpoint {
  projectionName: string;
  projectionVersion: string;
  lastGlobalPosition: number;
  updatedAt: string;
}

export interface Projection {
  readonly name: string;
  readonly version: string;
  
  handles(eventType: string): boolean;
  apply(event: DomainEvent<any>, globalPosition: number): Promise<void>;
  reset(): Promise<void>;
}

export interface ProjectionCheckpointStore {
  getCheckpoint(projectionName: string): Promise<ProjectionCheckpoint | null>;
  saveCheckpoint(checkpoint: ProjectionCheckpoint): Promise<void>;
}
