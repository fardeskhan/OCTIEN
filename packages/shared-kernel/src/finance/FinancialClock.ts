import { FiscalDate } from './FiscalDate';
import { LedgerPeriod } from './LedgerPeriod';

/**
 * Pure Dependency-Free Financial Kernel: FinancialClock
 * Decouples finance calculations from system `Date.now()`, enabling pure replay and time-travel testing.
 */
export interface FinancialClock {
  now(): string; // ISO-8601 UTC string
  today(): string; // ISO-8601 UTC start of day
  currentFiscalDate(): FiscalDate;
  currentLedgerPeriod(): LedgerPeriod;
}
