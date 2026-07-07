import { Projection, ProjectionEvent } from '../../../../../platform-runtime/src/cqrs/Projection';

export class ActualVsBudgetProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'ActualVsBudgetProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    // Only accepts BudgetLineCommitted (for budget) and JournalEntryPosted (for actual)
  }
  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }
  async reset(): Promise<void> {}
  async checkpoint(): Promise<void> {}
}
