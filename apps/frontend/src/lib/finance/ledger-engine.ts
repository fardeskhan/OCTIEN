/**
 * Ledger Engine — shared, domain-agnostic ledger mechanics.
 *
 * This owns ONLY the common infrastructure: chronological ordering + running-balance computation +
 * debit/credit totals. Domain services (Customer Ledger, Vendor Ledger, …) supply their own
 * transactions and keep their own business rules (overdue, credit limits, DSO, etc.). The point is
 * to avoid duplicating the running-balance/statement mechanics across every subledger — not to
 * merge distinct domains into one service.
 *
 * Balance convention: `runningBalance` accumulates `debit − credit`, so a positive balance means an
 * amount owed to us (AR) or owed by us (AP) depending on how the domain maps its entries.
 */
export interface LedgerEntry<T extends string = string> {
  date: Date;
  reference: string;
  type: T;
  debit: number;
  credit: number;
}

export interface LedgerLine<T extends string = string> extends LedgerEntry<T> {
  runningBalance: number;
}

export interface LedgerResult<T extends string = string> {
  lines: LedgerLine<T>[];
  totalDebit: number;
  totalCredit: number;
  /** Net balance = Σdebit − Σcredit (== the last line's running balance). */
  balance: number;
}

/** Sort entries chronologically and compute a running balance + totals. */
export function buildLedger<T extends string>(entries: LedgerEntry<T>[]): LedgerResult<T> {
  const sorted = [...entries].sort((a, b) => a.date.getTime() - b.date.getTime());
  let running = 0;
  let totalDebit = 0;
  let totalCredit = 0;
  const lines: LedgerLine<T>[] = sorted.map((e) => {
    running += e.debit - e.credit;
    totalDebit += e.debit;
    totalCredit += e.credit;
    return { ...e, runningBalance: running };
  });
  return { lines, totalDebit, totalCredit, balance: running };
}
