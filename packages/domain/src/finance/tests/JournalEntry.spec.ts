import { JournalEntry, JournalState } from '../aggregates/JournalEntry';
import { JournalLine } from '../entities/JournalLine';
import { Money } from '../value-objects/Money';
import { JournalNumber } from '../value-objects/JournalNumber';

describe('Journal Entry Aggregate', () => {
  const jrnNum = JournalNumber.create('JRN-2026-0001');

  it('strictly enforces minimum line counts and double-entry balancing', () => {
    const entry = JournalEntry.create('jrn_1', jrnNum, 'bus_001', 'USD', '2026', '06');

    const debitLine = JournalLine.create('line_1', 'acc_1', Money.create(100, 'USD'), null, Money.create(100, 'USD'), 1);
    entry.addLine(debitLine);

    expect(() => entry.validate()).toThrow('A journal entry must contain at least two lines.');

    const creditLine = JournalLine.create('line_2', 'acc_2', null, Money.create(99, 'USD'), Money.create(99, 'USD'), 1);
    entry.addLine(creditLine);

    // 100 Debit vs 99 Credit
    expect(() => entry.validate()).toThrow('Journal Imbalance: Debits (100) do not equal Credits (99).');

    // Fix it
    const fixedCredit = JournalLine.create('line_3', 'acc_2', null, Money.create(100, 'USD'), Money.create(100, 'USD'), 1);
    const validEntry = JournalEntry.create('jrn_2', jrnNum, 'bus_001', 'USD', '2026', '06');
    validEntry.addLine(debitLine);
    validEntry.addLine(fixedCredit);

    validEntry.validate();
    expect(validEntry.state).toBe(JournalState.VALIDATED);
  });

  it('creates an immutable, inverted clone upon reversal', () => {
    const entry = JournalEntry.create('jrn_1', jrnNum, 'bus_001', 'USD', '2026', '06');
    const debitLine = JournalLine.create('line_1', 'acc_1', Money.create(100, 'GBP'), null, Money.create(150, 'USD'), 1.5, 'Test');
    const creditLine = JournalLine.create('line_2', 'acc_2', null, Money.create(150, 'USD'), Money.create(150, 'USD'), 1, 'Test');

    entry.addLine(debitLine);
    entry.addLine(creditLine);
    entry.validate();
    entry.post();

    const revNum = JournalNumber.create('JRN-2026-0002');
    const reversal = entry.reverse('jrn_2', revNum);

    expect(entry.state).toBe(JournalState.REVERSED);
    expect(reversal.state).toBe(JournalState.VALIDATED); // Reversals are validated immediately

    const revLines = reversal.getLines();
    expect(revLines[0].isCredit()).toBe(true); // Original was debit
    expect(revLines[0].credit?.amount.toString()).toBe('100'); // GBP
    expect(revLines[0].baseAmount.amount.toString()).toBe('150'); // USD

    expect(revLines[1].isDebit()).toBe(true); // Original was credit
    expect(revLines[1].debit?.amount.toString()).toBe('150');
  });

  it('rejects modifications to posted entries', () => {
    const entry = JournalEntry.create('jrn_1', jrnNum, 'bus_001', 'USD', '2026', '06');
    entry.addLine(JournalLine.create('line_1', 'acc_1', Money.create(10, 'USD'), null, Money.create(10, 'USD'), 1));
    entry.addLine(JournalLine.create('line_2', 'acc_2', null, Money.create(10, 'USD'), Money.create(10, 'USD'), 1));
    
    entry.validate();
    entry.post();

    expect(() => entry.addLine(JournalLine.create('line_3', 'acc_3', Money.create(5, 'USD'), null, Money.create(5, 'USD'), 1)))
      .toThrow('Cannot add lines to a journal entry that is not in DRAFT state.');
  });
});
