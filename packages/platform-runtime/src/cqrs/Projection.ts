export interface ProjectionEvent {
  sequenceId: number;
  eventId: string;
  eventType: string; // e.g. JournalPosted, JournalReversed
  tenantId: string;
  timestamp: string;
  payload: any;
}

export interface Projection {
  name(): string;
  version(): number;
  
  apply(event: ProjectionEvent): Promise<void>;
  replay(events: ProjectionEvent[]): Promise<void>;
  
  reset(): Promise<void>; // Drops the current read-model tables
  checkpoint(): Promise<void>; // Flushes current sequence state to checkpoint store
}
