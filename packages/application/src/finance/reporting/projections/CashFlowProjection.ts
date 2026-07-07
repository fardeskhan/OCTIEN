import { Projection, ProjectionEvent } from '../../../../../platform-runtime/src/cqrs/Projection';

export class CashFlowProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'CashFlowProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {}
  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }
  async reset(): Promise<void> {}
  async checkpoint(): Promise<void> {}
}
