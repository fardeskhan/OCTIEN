import { AggregateRoot } from '../domain/AggregateRoot';
import { DomainEvent } from '../domain/AggregateRoot';

/**
 * Standard Capability Repository.
 * No capability-specific CRUD. Everything must conform to this interface.
 */
export interface CapabilityRepository<T extends AggregateRoot<any>, TId = string> {
  save(aggregate: T): Promise<void>;
  findById(id: TId): Promise<T | null>;
  exists(id: TId): Promise<boolean>;
  delete(id: TId): Promise<void>;
  find(specification: any): Promise<T[]>;
  findAll(specification: any): Promise<T[]>;
  count(specification: any): Promise<number>;
  nextIdentity(): TId;
  appendEvents(events: DomainEvent[]): Promise<void>;
  loadVersion(id: TId): Promise<number>;
}
