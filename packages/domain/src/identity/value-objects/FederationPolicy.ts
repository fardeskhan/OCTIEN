import { ValueObject } from '@cosmy/shared-kernel';

export interface FederationPolicyProps {
  autoProvisionUsers: boolean;
  defaultGroupIds: string[];
  requireMfaPostLogin: boolean;
}

export class FederationPolicy extends ValueObject<FederationPolicyProps> {
  private constructor(props: FederationPolicyProps) {
    super(props);
  }

  public static create(props: FederationPolicyProps): FederationPolicy {
    return new FederationPolicy(props);
  }

  public get autoProvisionUsers(): boolean {
    return this.props.autoProvisionUsers;
  }
}
