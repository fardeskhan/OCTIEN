export class BankCapabilityManifest {
  constructor(
    public readonly id: string,
    public readonly version: string,
    public readonly apiVersion: string,
    public readonly capabilities: {
      realtimeBalance: boolean;
      transactions: boolean;
      statements: { pdf: boolean; csv: boolean; json: boolean };
      webhooks: boolean;
      oauth: boolean;
    },
    public readonly limits: {
      maxRequestsPerMinute: number;
      maxHistoryDays: number;
    },
    public readonly security: {
      webhookSignature: string;
      tokenRotation: string;
    },
    public readonly health: {
      endpoint: string;
    }
  ) {}

  public static fromAdapterConfig(config: any): BankCapabilityManifest {
    // Factory mapping from YAML/JSON to Value Object.
    return new BankCapabilityManifest(
      config.adapter.id,
      config.adapter.version,
      config.adapter.apiVersion,
      config.capabilities,
      config.limits,
      config.security,
      config.health
    );
  }
}
