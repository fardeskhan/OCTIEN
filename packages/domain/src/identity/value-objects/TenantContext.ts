import { ValueObject } from '@cosmy/shared-kernel';

export interface TenantContextProps {
  tenantId: string;
  brandId?: string;
  isolationLevel: 'shared' | 'dedicated';
}

export class TenantContext extends ValueObject<TenantContextProps> {
  private constructor(props: TenantContextProps) {
    super(props);
  }

  public static create(props: TenantContextProps): TenantContext {
    return new TenantContext(props);
  }

  public get tenantId(): string {
    return this.props.tenantId;
  }

  public get brandId(): string | undefined {
    return this.props.brandId;
  }

  public get isolationLevel(): 'shared' | 'dedicated' {
    return this.props.isolationLevel;
  }
}
