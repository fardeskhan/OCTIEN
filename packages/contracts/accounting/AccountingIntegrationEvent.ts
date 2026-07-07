import { AccountingAmount, AccountingCurrency } from './AccountingAmount';
import { AccountingDimension } from './AccountingDimension';
import { AccountingDocumentReference } from './AccountingDocumentReference';
import { AccountingParty } from './AccountingParty';
import { AccountingMetadata } from './AccountingMetadata';

export enum FinancialIntent {
  Revenue = 'Revenue',
  Expense = 'Expense',
  Asset = 'Asset',
  Liability = 'Liability',
  Equity = 'Equity',
  Transfer = 'Transfer',
  Adjustment = 'Adjustment',
  Tax = 'Tax',
  FX = 'FX',
  Depreciation = 'Depreciation',
  Accrual = 'Accrual',
  Prepayment = 'Prepayment',
  Reversal = 'Reversal'
}

/**
 * PLATFORM ACCOUNTING CONTRACT v1
 * Immutable DTO boundary. All upstream domains MUST map to this exactly.
 * The General Ledger never consumes raw business events (e.g. SalesInvoiceCreated).
 */
export interface AccountingIntegrationEvent {
  contractVersion: string; // e.g. 'v1'
  financialIntent: FinancialIntent;
  
  metadata: AccountingMetadata;

  // Financial Policy Routing
  postingProfileId?: string;
  occurredAt: string; // ISO-8601 UTC

  // The actual immutable payload to be processed by the FPE
  amounts: AccountingAmount[];
  dimensions: AccountingDimension[];
  documentReferences: AccountingDocumentReference[];
  parties: AccountingParty[];
}
