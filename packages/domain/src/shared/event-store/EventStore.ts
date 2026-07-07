import { DomainEvent } from '../DomainEvent';
import { PersistedEvent } from './PersistedEvent';

export interface EventStore {
  append(streamId: string, expectedVersion: number, events: DomainEvent[]): Promise<void>;
  load(streamId: string, fromVersion?: number): Promise<PersistedEvent[]>;
  loadStream(streamId: string): AsyncIterable<PersistedEvent>;
  replay(fromGlobalPosition: number): AsyncIterable<PersistedEvent>;
}
