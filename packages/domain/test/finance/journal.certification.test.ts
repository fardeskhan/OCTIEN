import { describe, it, expect } from 'vitest';
import { Journal } from '../../src/finance/aggregates/Journal';
import { JournalLine } from '../../src/finance/entities/JournalLine';
import { JournalStatus } from '../../src/finance/value-objects/JournalStatus';
import { JournalIdempotencyKey } from '../../../shared-kernel/src/finance/JournalIdempotencyKey';
import { Decimal } from '../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../shared-kernel/src/finance/Currency';
import { BalancedJournalSpecification } from '../../src/finance/specifications/BalancedJournalSpecification';
import { HashIntegritySpecification } from '../../src/finance/specifications/HashIntegritySpecification';

describe('Immutable Journal Engine Certification', () => {
  const currency = new Currency('USD', 2);
  const key = new JournalIdempotencyKey('evt-123');

  it('rejects unbalanced journal lines (Double Entry Certification)', () => {
    const l1 = new JournalLine('l1', 'acc1', new Decimal('100.50', 2, 38), currency, 'DEBIT');
    const l2 = new JournalLine('l2', 'acc2', new Decimal('100.00', 2, 38), currency, 'CREDIT'); // off by 0.50
    
    const journal = new Journal('j1', 't1', key, new Date().toISOString(), [l1, l2], 'v1');
    const spec = new BalancedJournalSpecification();
    
    const result = spec.isSatisfiedBy(journal);
    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('unbalanced');
  });

  it('allows perfectly balanced journal lines', () => {
    const l1 = new JournalLine('l1', 'acc1', new Decimal('100.50', 2, 38), currency, 'DEBIT');
    const l2 = new JournalLine('l2', 'acc2', new Decimal('100.50', 2, 38), currency, 'CREDIT');
    
    const journal = new Journal('j1', 't1', key, new Date().toISOString(), [l1, l2], 'v1');
    const spec = new BalancedJournalSpecification();
    
    expect(spec.isSatisfiedBy(journal).isValid).toBe(true);
  });

  it('generates completely inverted compensating lines upon Reversal Certification', () => {
    const l1 = new JournalLine('l1', 'acc1', new Decimal('100', 2, 38), currency, 'DEBIT');
    const l2 = new JournalLine('l2', 'acc2', new Decimal('100', 2, 38), currency, 'CREDIT');
    const journal = new Journal('j1', 't1', key, new Date().toISOString(), [l1, l2], 'v1');
    
    journal.validate();
    journal.post('hash-123');
    
    const reversal = journal.reverse('rev-j1', 'Correction', 'System', 'v2');
    
    // Status mutated correctly
    expect(journal.status).toBe(JournalStatus.REVERSED);
    // Domain Event generated
    expect(journal.domainEvents.find(e => e.eventName === 'JournalReversed')).toBeDefined();
    
    // Reversal Journal properties verified
    expect(reversal.status).toBe(JournalStatus.DRAFT);
    expect(reversal.lines[0].type).toBe('CREDIT');
    expect(reversal.lines[1].type).toBe('DEBIT');
    expect(reversal.idempotencyKey.value).toBe('rev-evt-123');
  });

  it('rejects reversal of an already reversed journal (Double Reversal Protection)', () => {
    const l1 = new JournalLine('l1', 'acc1', new Decimal('100', 2, 38), currency, 'DEBIT');
    const l2 = new JournalLine('l2', 'acc2', new Decimal('100', 2, 38), currency, 'CREDIT');
    const journal = new Journal('j1', 't1', key, new Date().toISOString(), [l1, l2], 'v1');
    
    journal.validate();
    journal.post('hash-123');
    journal.reverse('rev-j1', 'Correction', 'System', 'v2');
    
    expect(() => journal.reverse('rev-j2', 'Double Correction', 'System', 'v2')).toThrow(/Only POSTED journals can be reversed/);
  });

  it('verifies ledger hash chain integrity', () => {
    const journal = new Journal('j1', 't1', key, new Date().toISOString(), [], 'v1', 'current-hash', 'expected-prev-hash');
    const spec = new HashIntegritySpecification();
    
    expect(spec.verifyChain(journal, 'expected-prev-hash').isValid).toBe(true);
    
    const failedResult = spec.verifyChain(journal, 'tampered-prev-hash');
    expect(failedResult.isValid).toBe(false);
    expect(failedResult.errors[0]).toContain('Hash chain broken');
  });
});
