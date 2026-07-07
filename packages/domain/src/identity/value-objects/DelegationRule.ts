import { ValueObject } from '@cosmy/shared-kernel';

export interface DelegationRuleProps {
  delegatorUserId: string;
  delegateeUserId: string;
  allowedPermissions: string[];
  validFrom: Date;
  validUntil: Date;
}

export class DelegationRule extends ValueObject<DelegationRuleProps> {
  private constructor(props: DelegationRuleProps) {
    super(props);
  }

  public static create(props: DelegationRuleProps): DelegationRule {
    return new DelegationRule(props);
  }

  public isValid(currentTime: Date): boolean {
    return currentTime >= this.props.validFrom && currentTime <= this.props.validUntil;
  }
}
