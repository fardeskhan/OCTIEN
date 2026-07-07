import { Projection } from './Projection';
import { DomainEvent } from '../DomainEvent';

export class ProjectionRegistry {
  private projections: Projection[] = [];

  public register(projection: Projection): void {
    this.projections.push(projection);
  }

  public getInterestedProjections(eventType: string): Projection[] {
    return this.projections.filter(p => p.handles(eventType));
  }

  public async dispatch(event: DomainEvent<any>, globalPosition: number): Promise<void> {
    const interested = this.getInterestedProjections(event.eventType);
    
    // Dispatch in parallel to all interested projections to isolate failures per projection
    const promises = interested.map(p => p.apply(event, globalPosition));
    await Promise.all(promises);
  }
}
