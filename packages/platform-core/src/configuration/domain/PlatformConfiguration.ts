import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';

export class PlatformConfiguration extends AggregateRoot<string> {
  private constructor(
    id: string,
    public license: {
      type: 'ENTERPRISE' | 'COMMUNITY' | 'TRIAL';
      edition: string;
      expiresAt: Date | null;
    },
    public clientBranding: {
      logoUrl: string | null;
      primaryColor: string | null;
      companyName: string | null;
    },
    public developerAttribution: {
      name: string;
      url: string;
      supportUrl: string;
    },
    public build: {
      version: string;
      hash: string;
    },
    public featureFlags: Map<string, boolean>
  ) {
    super(id);
  }

  public static create(id: string, version: string, hash: string): PlatformConfiguration {
    return new PlatformConfiguration(
      id,
      { type: 'COMMUNITY', edition: 'Standard', expiresAt: null },
      { logoUrl: null, primaryColor: null, companyName: null },
      { name: 'AETEREX', url: 'https://aeterex.com', supportUrl: 'https://support.aeterex.com' },
      { version, hash },
      new Map()
    );
  }

  public toggleFeature(flag: string, enabled: boolean): void {
    this.featureFlags.set(flag, enabled);
  }

  public isFeatureEnabled(flag: string): boolean {
    return this.featureFlags.get(flag) ?? false;
  }
}
