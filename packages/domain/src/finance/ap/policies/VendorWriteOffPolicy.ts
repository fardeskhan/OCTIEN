import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';
import { Currency } from '../../../../shared-kernel/src/finance/Currency';

export class VendorWriteOffPolicy {
  // Freezing the policy logic: DR Accounts Payable, CR Gain on Settlement
  public static executeWriteOff(vendorId: string, amount: Decimal, currency: Currency): void {
    // In v1.0, this static method simply documents the locked accounting policy.
    // It asserts that the translation inside APAccountingIntegrationService will ALWAYS map a VENDOR_WRITE_OFF intent
    // to DR AP and CR Gain on Settlement.
  }
}
