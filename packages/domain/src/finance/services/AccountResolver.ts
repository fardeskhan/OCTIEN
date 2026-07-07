export interface AccountIntent {
  subledger: string;
  transactionType: string;
  role: 'DEBIT' | 'CREDIT';
}

export interface PostingContext {
  tenantId: string;
  sourceDocumentId: string;
}

export interface AccountReference {
  accountId: string;
  accountNumber: string;
}

export interface AccountResolver {
  resolve(accountIntent: AccountIntent, context: PostingContext): AccountReference;
}

// Static mock used strictly for testing Phase 2
export class StaticAccountResolverMock implements AccountResolver {
  resolve(intent: AccountIntent, context: PostingContext): AccountReference {
    if (intent.subledger === 'AR') {
      if (intent.transactionType === 'SALE') {
        return intent.role === 'DEBIT' 
          ? { accountId: '1200', accountNumber: '1200' } // AR
          : { accountId: '4000', accountNumber: '4000' }; // Revenue
      }
      if (intent.transactionType === 'PAYMENT') {
        return intent.role === 'DEBIT'
          ? { accountId: '1000', accountNumber: '1000' } // Bank
          : { accountId: '1200', accountNumber: '1200' }; // AR
      }
      if (intent.transactionType === 'RETURN') {
        return intent.role === 'DEBIT'
          ? { accountId: '4100', accountNumber: '4100' } // Sales Returns
          : { accountId: '1200', accountNumber: '1200' }; // AR
      }
      if (intent.transactionType === 'WRITE_OFF') {
        return intent.role === 'DEBIT'
          ? { accountId: '6000', accountNumber: '6000' } // Bad Debt Expense
          : { accountId: '1200', accountNumber: '1200' }; // AR
      }
    }
    
    if (intent.subledger === 'AP') {
      if (intent.transactionType === 'PURCHASE') {
        return intent.role === 'DEBIT' 
          ? { accountId: '5000', accountNumber: '5000' } // Expense/Inventory
          : { accountId: '2000', accountNumber: '2000' }; // AP
      }
      if (intent.transactionType === 'PAYMENT') {
        return intent.role === 'DEBIT'
          ? { accountId: '2000', accountNumber: '2000' } // AP
          : { accountId: '1000', accountNumber: '1000' }; // Bank
      }
      if (intent.transactionType === 'PURCHASE_RETURN') {
        return intent.role === 'DEBIT'
          ? { accountId: '2000', accountNumber: '2000' } // AP
          : { accountId: '5000', accountNumber: '5000' }; // Expense/Inventory
      }
      if (intent.transactionType === 'VENDOR_WRITE_OFF') {
        return intent.role === 'DEBIT'
          ? { accountId: '2000', accountNumber: '2000' } // AP
          : { accountId: '7000', accountNumber: '7000' }; // Gain on Settlement
      }
    }

    if (intent.subledger === 'BANKING') {
      if (intent.transactionType === 'BANK_DEPOSIT') {
        return intent.role === 'DEBIT'
          ? { accountId: '1000', accountNumber: '1000' } // Bank
          : { accountId: '9000', accountNumber: '9000' }; // Source Account / Clearing
      }
      if (intent.transactionType === 'BANK_WITHDRAWAL') {
        return intent.role === 'DEBIT'
          ? { accountId: '5000', accountNumber: '5000' } // Target Account / Expense
          : { accountId: '1000', accountNumber: '1000' }; // Bank
      }
      if (intent.transactionType === 'BANK_FEE') {
        return intent.role === 'DEBIT'
          ? { accountId: '5010', accountNumber: '5010' } // Bank Charges
          : { accountId: '1000', accountNumber: '1000' }; // Bank
      }
      if (intent.transactionType === 'BANK_INTEREST') {
        return intent.role === 'DEBIT'
          ? { accountId: '1000', accountNumber: '1000' } // Bank
          : { accountId: '4010', accountNumber: '4010' }; // Interest Income
      }
    }
    
    throw new Error(`Unresolvable intent: ${intent.subledger} / ${intent.transactionType}`);
  }
}

