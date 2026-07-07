import { IFinanceUnitOfWork } from '../contracts/IFinanceUnitOfWork';
import { IFiscalPeriodPolicy } from '@cosmy/domain/src/finance/policies/IFiscalPeriodPolicy';
import { JournalPostedEvent } from '@cosmy/domain/src/finance/events/FinanceEvents';
import { CanPostJournalSpecification } from '@cosmy/domain/src/finance/specifications/CanPostJournalSpecification';
import { randomUUID } from 'crypto';

export class PostJournalEntryCommand {
  constructor(
    public readonly journalId: string,
    public readonly actorId: string,
    public readonly correlationId: string
  ) {}
}

export class PostJournalEntryHandler {
  constructor(
    private readonly uow: IFinanceUnitOfWork,
    private readonly fiscalPolicy: IFiscalPeriodPolicy
  ) {}

  public async handle(command: PostJournalEntryCommand): Promise<void> {
    await this.uow.begin();

    try {
      const journal = await this.uow.journals.findById(command.journalId);
      if (!journal) throw new Error('Journal not found');

      // Execute external domain specification mapping to Business Policies
      const canPostSpec = new CanPostJournalSpecification(this.fiscalPolicy);
      const isSatisfied = await canPostSpec.isSatisfiedBy(journal);
      if (!isSatisfied) {
        throw new Error('Journal cannot be posted: Fiscal Period closed or Invalid State.');
      }

      // Execute internal domain invariant logic
      await journal.post(this.fiscalPolicy);
      
      // Bump optimistic concurrency
      journal.version += 1;

      // Construct immutable integration event carrying required trace metadata
      const event = new JournalPostedEvent(
        {
          eventId: randomUUID(),
          eventType: 'Finance.JournalPosted',
          aggregateId: journal.id,
          aggregateVersion: journal.version,
          businessId: journal.businessId,
          correlationId: command.correlationId,
          causationId: command.journalId,
          actorId: command.actorId,
          occurredAt: new Date(),
          payloadVersion: '1.0'
        },
        {
          // Calculate the total base debit side cleanly
          totalBaseAmount: journal.getLines().filter(l => l.isDebit()).reduce((acc, l) => acc + l.baseAmount.amount.toNumber(), 0).toString()
        }
      );

      // Save aggregate and append to Outbox atomically
      await this.uow.journals.save(journal);
      await this.uow.outbox.append([event]);

      await this.uow.commit();
    } catch (e) {
      await this.uow.rollback();
      throw e;
    }
  }
}
