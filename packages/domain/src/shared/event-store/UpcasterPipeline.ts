import { DomainEvent } from '../DomainEvent';

export interface EventUpcaster<TFrom, TTo> {
  sourceType: string;
  sourceVersion: number;
  targetVersion: number;
  upcast(event: DomainEvent<TFrom>): DomainEvent<TTo>;
}

export class UpcasterPipeline {
  private upcasters: Map<string, EventUpcaster<any, any>[]> = new Map();

  register<TFrom, TTo>(upcaster: EventUpcaster<TFrom, TTo>): void {
    if (!this.upcasters.has(upcaster.sourceType)) {
      this.upcasters.set(upcaster.sourceType, []);
    }
    this.upcasters.get(upcaster.sourceType)!.push(upcaster);
    // Sort upcasters by source version to ensure sequential applying
    this.upcasters.get(upcaster.sourceType)!.sort((a, b) => a.sourceVersion - b.sourceVersion);
  }

  upcast(event: DomainEvent<any>): DomainEvent<any> {
    const applicableUpcasters = this.upcasters.get(event.eventType) || [];
    let currentEvent = event;

    for (const upcaster of applicableUpcasters) {
      if (currentEvent.payloadVersion === upcaster.sourceVersion) {
        currentEvent = upcaster.upcast(currentEvent);
      }
    }
    return currentEvent;
  }
}
