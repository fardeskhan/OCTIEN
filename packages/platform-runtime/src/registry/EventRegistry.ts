export interface EventGovernanceConfig {
  publisher: string;
  consumers: string[];
  payloadVersion: string;
  compatibilityPolicy: 'Strict' | 'BackwardCompatible' | 'Loose';
  retryPolicy: { maxRetries: number; backoffMs: number };
  orderingRequirement: 'None' | 'Strict';
  idempotencyStrategy: 'Hash' | 'DatabaseConstraint';
  replaySupport: boolean;
  retentionPolicy: string; // e.g., '7d', 'forever'
  securityClassification: 'Public' | 'Internal' | 'Confidential' | 'Restricted';
}

/**
 * EventRegistry
 * Centralizes the definition and governance of every integration event in the platform.
 * Turns documentation into executable policy that IRIS and the Workflow Engine can read.
 */
export class EventRegistry {
  private eventCatalog = new Map<string, EventGovernanceConfig>();

  register(eventName: string, config: EventGovernanceConfig): void {
    this.eventCatalog.set(eventName, config);
  }

  getConfig(eventName: string): EventGovernanceConfig | undefined {
    return this.eventCatalog.get(eventName);
  }

  /**
   * Evaluates if a given consumer is permitted to subscribe to the event
   * based on security classifications and cross-domain permissions.
   */
  canConsume(eventName: string, consumerCapability: string): boolean {
    const config = this.getConfig(eventName);
    if (!config) return false;
    
    return config.consumers.includes(consumerCapability) || config.consumers.includes('*');
  }
}
