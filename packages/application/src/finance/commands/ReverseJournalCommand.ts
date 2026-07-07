export class ReverseJournalCommand {
  constructor(
    public readonly originalJournalId: string,
    public readonly tenantId: string,
    public readonly reversalReason: string,
    public readonly reversedBy: string,
    public readonly reversalTimestamp: string, // ISO-8601 UTC
    public readonly approvalReference?: string
  ) {}
}
