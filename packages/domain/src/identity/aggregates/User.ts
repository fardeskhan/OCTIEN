import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { UserId } from '../value-objects/UserId';
import { RoleId } from '../value-objects/RoleId';
import { GroupId } from '../value-objects/GroupId';

export enum UserStatus {
  Pending = 'PENDING',
  Active = 'ACTIVE',
  Suspended = 'SUSPENDED',
  Deactivated = 'DEACTIVATED'
}

export class User extends AggregateRoot<UserId> {
  private _tenantId: TenantId;
  private _email: string;
  private _status: UserStatus;
  private _assignedRoleIds: Set<RoleId>;
  private _assignedGroupIds: Set<GroupId>;

  private constructor(
    id: UserId,
    tenantId: TenantId,
    email: string,
    status: UserStatus,
    roles: RoleId[] = [],
    groups: GroupId[] = []
  ) {
    super(id);
    this._tenantId = tenantId;
    this._email = email;
    this._status = status;
    this._assignedRoleIds = new Set(roles);
    this._assignedGroupIds = new Set(groups);
  }

  public static create(
    id: UserId,
    tenantId: TenantId,
    email: string
  ): User {
    const user = new User(id, tenantId, email, UserStatus.Pending);
    // user.addDomainEvent(new UserCreatedEvent(id, tenantId, email));
    return user;
  }

  // --- Aggregate Invariants & Business Logic ---

  public assignToGroup(groupId: GroupId): void {
    // In a real CQRS system, we'd verify the Group belongs to the same Tenant via Domain Service 
    // before issuing the command, but the Aggregate enforces structural integrity.
    if (this._status === UserStatus.Deactivated) {
      throw new Error("Cannot assign groups to a deactivated user.");
    }
    this._assignedGroupIds.add(groupId);
    // this.addDomainEvent(new UserAssignedToGroupEvent(this.id, groupId));
  }

  public assignRole(roleId: RoleId): void {
    if (this._status === UserStatus.Deactivated) {
      throw new Error("Cannot assign roles to a deactivated user.");
    }
    this._assignedRoleIds.add(roleId);
    // this.addDomainEvent(new UserRoleAssignedEvent(this.id, roleId));
  }

  public suspend(reason: string): void {
    this._status = UserStatus.Suspended;
    // this.addDomainEvent(new UserSuspendedEvent(this.id, reason));
  }

  // --- Getters ---
  get tenantId(): TenantId { return this._tenantId; }
  get email(): string { return this._email; }
  get status(): UserStatus { return this._status; }
  get assignedRoleIds(): ReadonlyArray<RoleId> { return Array.from(this._assignedRoleIds); }
  get assignedGroupIds(): ReadonlyArray<GroupId> { return Array.from(this._assignedGroupIds); }
}
