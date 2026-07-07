import { Projection, ProjectionEvent } from '../../../../platform-runtime/src/cqrs/Projection';

export class JournalProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'JournalProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    // 1. Insert or update flat 'read_journals' table
    // 2. For JournalReversed, mark original journal's status = REVERSED and link reversalId
  }

  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }

  async reset(): Promise<void> {
    // TRUNCATE TABLE read_journals;
  }

  async checkpoint(): Promise<void> {
    // Flush state to CheckpointStore
  }
}
