import { describe, it, expect } from 'vitest';
import { Journal, JournalLine, JournalAuditTrail } from '../../src/finance/aggregates/Journal';

describe('CAP-FINANCE: Journal Aggregate', () => {

  const createValidAudit = (): JournalAuditTrail => ({
    createdBy: 'user-123',
    sourceCapability: 'CAP-SALES',
    sourceAggregateId: 'invoice-456',
    correlationId: 'corr-789',
    traceId: 'trace-001',
    eventId: 'event-001',
  });

  const createLine = (accountId: string, isDebit: boolean, amount: number): JournalLine => ({
    accountId,
    isDebit,
    baseAmount: amount,
    transactionAmount: amount,
    currency: 'INR',
    exchangeRate: 1.0,
    dimensions: new Map<string, string>()
  });

  describe('Mathematical Double-Entry Integrity', () => {
    it('accepts perfectly balanced journals', () => {
      const journal = new Journal(
        'JV-001',
        'tenant-a',
        'GENERAL_JOURNAL',
        new Date(),
        [
          createLine('acc-cash', true, 1000.50),
          createLine('acc-revenue', false, 1000.50)
        ],
        createValidAudit()
      );
      
      expect(journal).toBeDefined();
    });

    it('rejects imbalanced journals throwing Double-Entry Violation', () => {
      expect(() => {
        new Journal(
          'JV-002',
          'tenant-a',
          'GENERAL_JOURNAL',
          new Date(),
          [
            createLine('acc-cash', true, 1000.50),
            createLine('acc-revenue', false, 1000.49) // Imbalance by 0.01
          ],
          createValidAudit()
        );
      }).toThrowError(/Double-Entry Violation/);
    });
  });

  describe('Immutable State Machine', () => {
    it('enforces exact approval and posting hierarchy', () => {
      const journal = new Journal(
        'JV-003',
        'tenant-a',
        'GENERAL_JOURNAL',
        new Date(),
        [
          createLine('acc-cash', true, 500),
          createLine('acc-revenue', false, 500)
        ],
        createValidAudit()
      );

      // Must follow DRAFT -> VALIDATED -> PENDING_APPROVAL -> APPROVED -> POSTED
      journal.validate();
      journal.requestApproval();
      journal.approve('manager-1');
      
      // Before posting, it has no ledger hash
      expect(journal.getLedgerHash()).toBeUndefined();
      
      journal.post('worker-fpe-1', 'prev-ledger-hash-abc');

      // Assert cryptographically chained hash is generated upon post
      const hash = journal.getLedgerHash();
      expect(hash).toBeDefined();
      expect(hash).toContain('mock-hash'); // Or real SHA-256 implementation
    });

    it('prevents posting of unapproved journals', () => {
      const journal = new Journal(
        'JV-004',
        'tenant-a',
        'GENERAL_JOURNAL',
        new Date(),
        [
          createLine('acc-cash', true, 500),
          createLine('acc-revenue', false, 500)
        ],
        createValidAudit()
      );

      expect(() => journal.post('worker-fpe-1', 'prev')).toThrowError(/APPROVED before posting/);
    });

    it('enforces immutable reversals over deletion', () => {
      const journal = new Journal(
        'JV-005',
        'tenant-a',
        'GENERAL_JOURNAL',
        new Date(),
        [
          createLine('acc-cash', true, 500),
          createLine('acc-revenue', false, 500)
        ],
        createValidAudit()
      );

      journal.validate();
      journal.requestApproval();
      journal.approve('manager-1');
      journal.post('worker-fpe-1', 'prev');

      // Valid reversal
      expect(() => journal.reverse('JV-006', 'cfo-1')).not.toThrow();
    });
  });

});
