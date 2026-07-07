export class PostJournalCommand {
  constructor(
    public readonly batchPayload: any // Represents the fully validated batch
  ) {}
}
