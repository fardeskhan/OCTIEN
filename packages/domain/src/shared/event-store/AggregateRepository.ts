import { AggregateRoot } from '../AggregateRoot';
import { EventStore } from './EventStore';
import { SnapshotStore, Snapshot } from './SnapshotStore';
import { UpcasterPipeline } from './UpcasterPipeline';

export class AggregateRepository {
  constructor(
    private readonly eventStore: EventStore,
    private readonly snapshotStore: SnapshotStore,
    private readonly upcasterPipeline: UpcasterPipeline
  ) {}

  public async load<TAggregate extends AggregateRoot<any>>(
    aggregateId: string,
    aggregateType: string,
    factory: () => TAggregate
  ): Promise<TAggregate> {
    const aggregate = factory();
    
    // 1. Attempt to load snapshot
    const snapshot = await this.snapshotStore.loadSnapshot(aggregateId, aggregateType);
    let fromVersion = 0;
    
    if (snapshot) {
      // Validate snapshot schema version (Amendment 2)
      this.validateSnapshotSchema(snapshot);
      // Hydrate aggregate
      if (typeof (aggregate as any).hydrate === 'function') {
        (aggregate as any).hydrate(snapshot.state);
        aggregate.version = snapshot.version;
        fromVersion = snapshot.version;
      }
    }

    // 2. Load delta events from stream
    const persistedEvents = await this.eventStore.load(aggregateId, fromVersion + 1);
    
    // 3. Upcast and Replay
    for (const persistedEvent of persistedEvents) {
      const upcastedEvent = this.upcasterPipeline.upcast(persistedEvent.event);
      // Apply historical event
      if (typeof (aggregate as any).applyEvent === 'function') {
        (aggregate as any).applyEvent(upcastedEvent);
      }
      aggregate.version = persistedEvent.streamVersion;
    }

    // Clear uncommitted events generated during replay just in case
    aggregate.clearEvents();

    return aggregate;
  }

  public async save<TAggregate extends AggregateRoot<any>>(aggregate: TAggregate): Promise<void> {
    const uncommittedEvents = aggregate.domainEvents;
    if (uncommittedEvents.length === 0) return;

    const expectedVersion = aggregate.version - uncommittedEvents.length;

    await this.eventStore.append(aggregate.id.toString(), expectedVersion, uncommittedEvents);
    aggregate.clearEvents();
  }

  private validateSnapshotSchema(snapshot: Snapshot): void {
    if (!snapshot.schemaVersion) {
      throw new Error(`Invalid Snapshot: Missing schemaVersion for ${snapshot.aggregateId}`);
    }
  }
}
