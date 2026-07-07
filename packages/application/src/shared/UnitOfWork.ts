import { DomainEvent } from 'domain/src/shared/DomainEvent';

/**
 * Unit of Work Contract
 * Orchestrates transaction boundaries, repository commits, and event dispatching without leaking framework logic.
 */
export interface UnitOfWork {
  /** Begins a new transaction */
  start(): Promise<void>;
  
  /** Commits the transaction and persists aggregate changes */
  commit(): Promise<void>;
  
  /** Rolls back the transaction on failure */
  rollback(): Promise<void>;
  
  /** Dispatches accumulated domain events to the Event Bus / Message Broker */
  publishEvents(events: DomainEvent[]): Promise<void>;
  
  /** 
   * Provides access to repositories within the current transaction scope.
   * e.g., uow.getRepository(InventoryRepository) 
   */
  getRepository<T>(repositoryName: string): T;
}
