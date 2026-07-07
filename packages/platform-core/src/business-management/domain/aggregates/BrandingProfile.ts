import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { BrandingProfileUpdated } from '../events';

export class BrandingProfile extends AggregateRoot<string> {
  private constructor(
    id: string,
    public readonly businessId: string,
    public readonly profileName: string, // e.g. Corporate, Retail, Internal
    public logos: any,
    public favicons: any,
    public semanticThemeTokens: any, // primary, secondary, surface, border, etc.
    public typography: any,
    public documentTemplates: any,
    public emailTemplates: any,
    public loginAssets: any,
    public watermarks: any,
    public localeDefaults: any,
    public developerAttributionPolicy: 'Standard' | 'Professional' | 'FullWhiteLabel',
    public readonly version: number,
    public readonly previousVersionId: string | null
  ) {
    super(id);
  }

  public static create(businessId: string, profileName: string): BrandingProfile {
    const id = crypto.randomUUID();
    return new BrandingProfile(
      id, businessId, profileName,
      {}, {}, {}, {}, {}, {}, {}, {}, {}, 'Standard',
      1, null
    );
  }

  public updateTheme(tokens: any): void {
    this.semanticThemeTokens = tokens;
    this.addDomainEvent(new BrandingProfileUpdated(this.id));
  }
}
