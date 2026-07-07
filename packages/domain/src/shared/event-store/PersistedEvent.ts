import { DomainEvent } from '../DomainEvent';

export interface PersistedEvent<T = any> {
  globalPosition: number;
  streamId: string;
  streamVersion: number;
  event: DomainEvent<T>;
}
