import { Journal } from '../aggregates/Journal';
import { JournalStatus } from '../value-objects/JournalStatus';

export class JournalStatusSpecification {
  canPost(journal: Journal): { isValid: boolean; errors: string[] } {
    if (journal.status === JournalStatus.POSTED) {
      return { isValid: false, errors: ['Journal is already POSTED.'] };
    }
    if (journal.status === JournalStatus.REVERSED) {
      return { isValid: false, errors: ['Journal has been REVERSED and cannot be posted.'] };
    }
    if (journal.status === JournalStatus.PENDING_APPROVAL) {
      return { isValid: false, errors: ['Journal is PENDING_APPROVAL and cannot be posted without authorization.'] };
    }
    
    return { isValid: true, errors: [] };
  }
}
