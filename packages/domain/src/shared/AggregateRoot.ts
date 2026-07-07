import { DomainEvent } from './DomainEvent';

export abstract class AggregateRoot<TId> {
  public readonly id!: TId;
  public version: number = 0; // Optimistic Concurrency Control

  private readonly _domainEvents: DomainEvent[] = [];

  get domainEvents(): DomainEvent[] {
    return [...this._domainEvents];
  }

  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  public clearEvents(): void {
    this._domainEvents.length = 0;
  }

  public incrementVersion(): void {
    this.version++;
  }
}
