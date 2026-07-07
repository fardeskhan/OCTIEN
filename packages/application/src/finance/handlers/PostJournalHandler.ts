import { PostJournalCommand } from '../commands/PostJournalCommand';

export class PostJournalHandler {
  async handle(command: PostJournalCommand): Promise<void> {
    // Translates the Command into the domain Aggregate `Journal.post()`
    // Generates Ledger Hash
    // Appends to Event Sourcing Repository
    // Publishes JournalPosted event to Outbox for Projections
  }
}
