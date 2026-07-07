import { JournalIdempotencyKey } from '../../../../shared-kernel/src/finance/JournalIdempotencyKey';

export class DuplicateJournalSpecification {
  constructor(private readonly journalRepository: any) {}

  async isUnique(key: JournalIdempotencyKey, tenantId: string): Promise<{ isValid: boolean; errors: string[] }> {
    const exists = await this.journalRepository.exists(key.value, tenantId);
    
    if (exists) {
      return { isValid: false, errors: [`Journal with Idempotency Key ${key.value} already exists.`] };
    }
    
    return { isValid: true, errors: [] };
  }
}
