import { describe, it, expect, vi } from 'vitest';
import { PostingWorker, PostingState } from '../src/posting-engine/PostingWorker';
import { FinancialValidationEngine, BalancedJournalSpecification } from '../src/posting-engine/FinancialValidationEngine';
import { PostingRuleRegistry } from '../src/posting-engine/PostingRuleRegistry';
import { PostingPlanner } from '../src/posting-engine/PostingPlanner';
import { PostingBatchBuilder } from '../src/posting-engine/PostingBatchBuilder';
import { FinancialIntent } from '../../contracts/accounting/AccountingIntegrationEvent';

describe('End-to-End Posting Pipeline', () => {
  it('should transition through the exact state machine for a valid Sales Invoice', async () => {
    // 1. Arrange Mocks
    const registry = new PostingRuleRegistry();
    const planner = new PostingPlanner();
    const builder = new PostingBatchBuilder();
    const validation = new FinancialValidationEngine([new BalancedJournalSpecification()]);
    
    // The dispatcher acts as our Application Boundary spy
    const dispatcher = { dispatch: vi.fn().mockResolvedValue(true) };
    const dlq = { enqueue: vi.fn() };

    const worker = new PostingWorker(registry, planner, builder, validation, dispatcher, dlq);

    // 2. Mock Event
    const event = {
      contractVersion: 'v1.0.0',
      financialIntent: FinancialIntent.Revenue,
      metadata: {
        tenantId: 'tenant-123',
        sourceCapability: 'CAP-SALES',
        eventId: 'evt-456',
        sourceAggregate: 'Invoice'
      },
      amounts: [],
      dimensions: [],
      documentReferences: [],
      parties: []
    } as any;

    // 3. Act
    await worker.handleEvent(event);

    // 4. Assert Pipeline Completion
    expect(dispatcher.dispatch).toHaveBeenCalled();
    expect(dlq.enqueue).not.toHaveBeenCalled();
  });

  it('should route into DLQ when Financial Validation explicitly fails', async () => {
    const registry = new PostingRuleRegistry();
    const planner = new PostingPlanner();
    const builder = new PostingBatchBuilder();
    
    // Intentionally inject a failing specification
    const failingSpec = { isSatisfiedBy: () => ({ isValid: false, errors: ['Double Entry Imbalance'] }) };
    const validation = new FinancialValidationEngine([failingSpec]);
    
    const dispatcher = { dispatch: vi.fn() };
    const dlq = { enqueue: vi.fn().mockResolvedValue(true) };

    const worker = new PostingWorker(registry, planner, builder, validation, dispatcher, dlq);
    const event = { metadata: { tenantId: '1', sourceCapability: 'x', eventId: '1' }, financialIntent: FinancialIntent.Adjustment } as any;

    await worker.handleEvent(event);

    expect(dispatcher.dispatch).not.toHaveBeenCalled(); // The Journal is prevented from hitting the DB
    expect(dlq.enqueue).toHaveBeenCalled(); // Safely preserved in the DLQ
  });
});
