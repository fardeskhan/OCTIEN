import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export class JournalLine {
  private _isLocked: boolean = false;

  constructor(
    public readonly id: string,
    public readonly accountId: string, // Concrete ID, not a symbol
    public readonly amount: Decimal,
    public readonly currency: Currency,
    public readonly type: 'DEBIT' | 'CREDIT',
    public readonly exchangeRate?: any,
    public readonly dimensions?: any,
    public readonly narration?: string
  ) {}

  public lock(): void {
    this._isLocked = true;
  }

  public get isLocked(): boolean {
    return this._isLocked;
  }
}
