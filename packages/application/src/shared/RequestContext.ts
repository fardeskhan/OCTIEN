export interface RequestContext {
  readonly businessId: string;
  readonly tenantId: string;
  readonly actorId: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly requestId: string;
  readonly traceId: string;
  readonly locale: string;
  readonly timezone: string;
  readonly permissions: string[];
  readonly featureFlags: Record<string, boolean>;
}
