import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { BusinessSettingsUpdated } from '../events';

export class BusinessSettings extends AggregateRoot<string> {
  private constructor(
    id: string,
    public readonly businessId: string,
    public general: any,
    public localization: any,
    public branding: any,
    public currency: any,
    public fiscal: any,
    public inventory: any,
    public sales: any,
    public purchasing: any,
    public manufacturing: any,
    public finance: any,
    public aiSettings: any,
    public featureFlags: any,
    public regionalCompliance: any,
    public printing: any,
    public documents: any,
    public readonly version: number,
    public readonly previousVersionId: string | null
  ) {
    super(id);
  }

  public static create(businessId: string): BusinessSettings {
    const id = crypto.randomUUID();
    return new BusinessSettings(
      id, businessId,
      {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {},
      1, null
    );
  }

  public updateDomainSettings(domain: string, payload: any): void {
    (this as any)[domain] = payload;
    this.addDomainEvent(new BusinessSettingsUpdated(this.businessId));
  }

  public static reconstitute(
    id: string, businessId: string, general: any, localization: any, branding: any, 
    currency: any, fiscal: any, inventory: any, sales: any, purchasing: any, 
    manufacturing: any, finance: any, aiSettings: any, featureFlags: any, 
    regionalCompliance: any, printing: any, documents: any
  ): BusinessSettings {
    return new BusinessSettings(
      id, businessId, general, localization, branding, currency, fiscal, 
      inventory, sales, purchasing, manufacturing, finance, aiSettings, 
      featureFlags, regionalCompliance, printing, documents
    );
  }
}
