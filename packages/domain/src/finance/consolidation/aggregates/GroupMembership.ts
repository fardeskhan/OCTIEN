import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class GroupMembership {
  constructor(
    public readonly membershipId: string,
    public readonly groupId: string,
    public readonly entityId: string,
    public readonly ownershipPercentage: Decimal
  ) {}
}
