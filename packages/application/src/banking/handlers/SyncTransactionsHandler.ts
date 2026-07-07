import { SyncTransactionsCommand } from '../commands/SyncTransactionsCommand';
import { SyncJob, SyncJobStatus } from '../../../../domain/src/banking/aggregates/SyncJob';
import { IFinancialConnectivity } from '../../../../shared-kernel/src/services/IFinancialConnectivity';

export class SyncTransactionsHandler {
  constructor(
    private readonly connectivityService: IFinancialConnectivity,
    // private readonly syncJobRepository: ISyncJobRepository,
    // private readonly connectionRepository: IBankConnectionRepository
  ) {}

  async handle(command: SyncTransactionsCommand): Promise<void> {
    // 1. Validate Connection Exists & Is Healthy
    // 2. Initialize or Resume SyncJob aggregate
    const job = SyncJob.start(`job_${Date.now()}`, command.tenantId, command.connectionId, new Date());
    
    try {
      // 3. Delegate pure execution to Platform Connectivity (Vault + Adapter Runtime)
      // The domain NEVER sees the raw API Keys or OAuth tokens.
      const result = await this.connectivityService.executeAdapter<{ nextCursor: string, records: any[] }>(
        'ICICI_ADAPTER', // Resolved dynamically
        'vault-ref-1234',
        'FETCH_TRANSACTIONS',
        { cursor: command.cursor, accountId: command.accountId }
      );

      // 4. Update Checkpoint for resumable syncing
      job.updateCheckpoint(result.nextCursor, result.records.length);
      job.finish(new Date());

      // 5. Normalization Pipeline & Event emission happens downstream
      
    } catch (error) {
      job.fail(new Date());
      // Emit SYNC_FAILED operational event
    }

    // await this.syncJobRepository.save(job);
  }
}
