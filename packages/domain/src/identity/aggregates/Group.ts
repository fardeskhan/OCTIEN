import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { GroupId } from '../value-objects/GroupId';
import { RoleId } from '../value-objects/RoleId';
import { UserId } from '../value-objects/UserId';

export class Group extends AggregateRoot<GroupId> {
  private _tenantId: TenantId;
  private _name: string;
  private _description: string;
  private _assignedRoleIds: Set<RoleId>;
  private _memberUserIds: Set<UserId>;

  private constructor(
    id: GroupId,
    tenantId: TenantId,
    name: string,
    description: string,
    roles: RoleId[] = [],
    members: UserId[] = []
  ) {
    super(id);
    this._tenantId = tenantId;
    this._name = name;
    this._description = description;
    this._assignedRoleIds = new Set(roles);
    this._memberUserIds = new Set(members);
  }

  public static create(
    id: GroupId,
    tenantId: TenantId,
    name: string,
    description: string
  ): Group {
    return new Group(id, tenantId, name, description);
  }

  public assignRole(roleId: RoleId): void {
    this._assignedRoleIds.add(roleId);
    // this.addDomainEvent(new GroupRoleAssignedEvent(this.id, roleId));
  }

  public addMember(userId: UserId): void {
    this._memberUserIds.add(userId);
    // this.addDomainEvent(new UserAddedToGroupEvent(this.id, userId));
  }

  public removeMember(userId: UserId): void {
    this._memberUserIds.delete(userId);
    // this.addDomainEvent(new UserRemovedFromGroupEvent(this.id, userId));
  }

  get tenantId(): TenantId { return this._tenantId; }
  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get assignedRoleIds(): ReadonlyArray<RoleId> { return Array.from(this._assignedRoleIds); }
  get memberUserIds(): ReadonlyArray<UserId> { return Array.from(this._memberUserIds); }
}
