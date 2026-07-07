import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';
import { PaymentAuthorizationRequiredException } from '../exceptions/PaymentAuthorizationRequiredException';

export enum PaymentStatus {
  DRAFT = 'DRAFT',
  AUTHORIZED = 'AUTHORIZED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export interface PaymentAuthorization {
  authorizedBy: string;
  authorizedAt: string;
  authorizationReference?: string;
}

export class Payment {
  private _status: PaymentStatus = PaymentStatus.DRAFT;
  private _authorization?: PaymentAuthorization;

  constructor(
    public readonly paymentId: string,
    public readonly tenantId: string,
    public readonly vendorId: string,
    public readonly originalAmount: Decimal,
    public readonly currency: Currency,
    public readonly paymentDate: string,
    public readonly idempotencyKey: string
  ) {}

  get status(): PaymentStatus {
    return this._status;
  }

  get authorization(): PaymentAuthorization | undefined {
    return this._authorization;
  }

  public authorize(authorizedBy: string, authorizationReference?: string): void {
    if (this._status !== PaymentStatus.DRAFT) throw new Error('Only DRAFT payments can be AUTHORIZED');
    
    this._authorization = {
      authorizedBy,
      authorizedAt: new Date().toISOString(),
      authorizationReference
    };
    this._status = PaymentStatus.AUTHORIZED;
  }

  public post(): void {
    if (this._status !== PaymentStatus.AUTHORIZED) {
      throw new PaymentAuthorizationRequiredException(this.paymentId);
    }
    this._status = PaymentStatus.POSTED;
  }

  public reverse(): void {
    if (this._status !== PaymentStatus.POSTED) throw new Error('Only POSTED payments can be REVERSED');
    this._status = PaymentStatus.REVERSED;
  }
}
