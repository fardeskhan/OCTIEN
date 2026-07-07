import { ValueObject } from '@cosmy/shared-kernel';

export interface PermissionProps {
  action: string;      // e.g., 'read', 'write', 'execute', 'approve'
  resource: string;    // e.g., 'sales:orders', 'inventory:warehouses'
  effect: 'allow' | 'deny';
}

export class Permission extends ValueObject<PermissionProps> {
  private constructor(props: PermissionProps) {
    super(props);
  }

  public static create(props: PermissionProps): Permission {
    return new Permission(props);
  }

  public get action(): string {
    return this.props.action;
  }

  public get resource(): string {
    return this.props.resource;
  }

  public get effect(): 'allow' | 'deny' {
    return this.props.effect;
  }
}
