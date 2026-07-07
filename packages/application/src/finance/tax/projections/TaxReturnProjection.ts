import { Projection, ProjectionEvent } from '../../../../../platform-runtime/src/cqrs/Projection';

export class TaxReturnProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'TaxReturnProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {}
  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }
  async reset(): Promise<void> {}
  async checkpoint(): Promise<void> {}
}
