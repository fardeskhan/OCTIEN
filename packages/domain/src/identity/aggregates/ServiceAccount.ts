import { AggregateRoot } from '@cosmy/shared-kernel';

export interface ServiceAccountProps {
  tenantId: string;
  name: string;
  description: string;
  clientId: string;
  clientSecretHash: string;
  roleIds: string[];
  isActive: boolean;
}

export class ServiceAccount extends AggregateRoot<ServiceAccountProps> {
  private constructor(props: ServiceAccountProps, id?: string) {
    super(props, id);
  }

  public static create(props: Omit<ServiceAccountProps, 'isActive'>): ServiceAccount {
    return new ServiceAccount({
      ...props,
      isActive: true,
    });
  }

  public disable(): void {
    this.props.isActive = false;
    this.incrementVersion();
  }

  public assignRole(roleId: string): void {
    if (!this.props.roleIds.includes(roleId)) {
      this.props.roleIds.push(roleId);
      this.incrementVersion();
    }
  }
}
