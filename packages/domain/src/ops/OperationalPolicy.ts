export interface RetryConfiguration {
  maxAttempts: number;
  cooldownMs: number;
  escalateAfter: number;
}

export interface NotificationConfiguration {
  notifySlack: boolean;
  notifyEmail: boolean;
  notifyPagerDuty: boolean;
}

/**
 * Domain Aggregate governing the conservative automated self-healing boundaries
 * of CAP-OPS. Determines precisely when the Platform should attempt to recover
 * a crashed Worker via Checkpoints versus when it should halt and escalate to humans.
 */
export class OperationalPolicy {
  constructor(
    private readonly policyId: string,
    private readonly capability: string,
    private readonly component: string,
    private readonly retryRules: RetryConfiguration,
    private readonly notifications: NotificationConfiguration,
    private readonly autoDisableWorker: boolean
  ) {}

  public evaluateWorkerState(currentCrashCount: number): 'RESTART' | 'DRAIN' | 'RECOVER' | 'QUARANTINE' | 'ESCALATE' {
    if (currentCrashCount === 0) return 'RESTART';
    
    if (currentCrashCount === 1) return 'DRAIN';

    if (currentCrashCount === 2) return 'RECOVER';

    if (currentCrashCount === 3 && this.autoDisableWorker) return 'QUARANTINE';

    return 'ESCALATE';
  }

  public shouldAutoDisable(): boolean {
    return this.autoDisableWorker;
  }
}
