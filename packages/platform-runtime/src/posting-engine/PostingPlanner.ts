import { AccountingIntegrationEvent } from '../../../contracts/accounting/AccountingIntegrationEvent';
import { AccountResolver } from './AccountResolver';

export class PostingPlanner {
  constructor(
    private readonly accountResolver: AccountResolver
  ) {}

  async plan(event: AccountingIntegrationEvent, rules: any): Promise<any> {
    // 1. Resolve AccountReference symbols from `rules` into physical AccountIds using AccountResolver.
    // 2. Maps dimensions to natural accounts based on the resolved rule templates.
    // 3. Evaluates against active AccountingPolicy rules.
    return {
      eventId: event.metadata.eventId,
      plannedLines: []
    };
  }
}
