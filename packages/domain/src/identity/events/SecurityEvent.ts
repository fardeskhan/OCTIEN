import { DomainEvent } from '@cosmy/shared-kernel';

export class SecurityEvent extends DomainEvent {
  constructor(
    public readonly aggregateId: string, // Could be UserId or SessionId
    public readonly tenantId: string,
    public readonly eventCategory: 'LOGIN_SUCCESS' | 'LOGIN_FAILURE' | 'MFA_CHALLENGE' | 'IMPERSONATION_STARTED' | 'SUSPICIOUS_ACTIVITY',
    public readonly ipAddress: string,
    public readonly userAgent: string,
    public readonly riskScore: number
  ) {
    super(aggregateId, 'Identity', 'SecurityEventOccurred');
  }
}
