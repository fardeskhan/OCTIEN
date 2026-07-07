import { BankTransactionData } from '../IBankGateway';

export class ICICITransactionNormalizer {
  /**
   * Translates proprietary ICICI corporate API payloads into the strictly typed 
   * COSMY Domain Transaction structures.
   */
  public normalize(rawTx: any): BankTransactionData {
    if (!rawTx.TranId || !rawTx.Amount) {
      throw new Error("Invalid ICICI Transaction Payload: Missing critical identity fields.");
    }

    return {
      transactionId: rawTx.TranId,
      amount: parseFloat(rawTx.Amount),
      currency: rawTx.Currency || 'INR', // Defaulting to INR for domestic corporate API
      date: new Date(rawTx.ValueDate),
      reference: rawTx.Remarks || '',
      type: parseFloat(rawTx.Amount) >= 0 ? 'CREDIT' : 'DEBIT',
      utr: rawTx.UTRNo || undefined
    };
  }
}
