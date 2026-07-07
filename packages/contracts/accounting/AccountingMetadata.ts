export interface AccountingMetadata {
  tenantId: string;
  correlationId: string;
  causationId: string;
  traceId: string;
  requestId: string;
  eventId: string;
  eventVersion: string;
  schemaVersion: string;
  
  sourceCapability: string;
  sourceAggregate: string;
  sourceCommand: string;
  
  postingProfileVersion?: string;
  postingRuleVersion?: string;
  policyVersion?: string;
  
  createdBy: string;
  createdAt: string; // ISO-8601 UTC
}
