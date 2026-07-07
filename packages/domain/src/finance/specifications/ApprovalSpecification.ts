import { Journal } from '../aggregates/Journal';
import { JournalStatus } from '../value-objects/JournalStatus';

export class ApprovalSpecification {
  constructor(private readonly policyApprovalLimit: string = '500000') {} // Example limit

  isSatisfiedBy(journal: Journal): { isValid: boolean; errors: string[] } {
    if (journal.status === JournalStatus.DRAFT || journal.status === JournalStatus.VALIDATED) {
      // Determine if the absolute sum of the journal exceeds the policy limit
      // If it does, we reject a direct POST and force it into PENDING_APPROVAL.
      let totalAmount = 0; // naive string/decimal summing mock
      for (const line of journal.lines) {
        if (line.type === 'DEBIT') totalAmount += parseFloat(line.amount.value);
      }

      if (totalAmount > parseFloat(this.policyApprovalLimit)) {
         return { isValid: false, errors: [`Journal exceeds approval limit of ${this.policyApprovalLimit}. Must transition to PENDING_APPROVAL.`] };
      }
    }
    return { isValid: true, errors: [] };
  }
}
