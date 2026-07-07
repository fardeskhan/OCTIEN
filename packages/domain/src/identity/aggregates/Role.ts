import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { RoleId } from '../value-objects/RoleId';
import { PermissionSetId } from '../value-objects/PermissionSetId';

export class Role extends AggregateRoot<RoleId> {
  private _tenantId: TenantId;
  private _name: string;
  private _description: string;
  private _parentRoleId?: RoleId;
  private _permissionSetIds: Set<PermissionSetId>;
  private _version: number;

  private constructor(
    id: RoleId,
    tenantId: TenantId,
    name: string,
    description: string,
    parentRoleId?: RoleId,
    permissionSets: PermissionSetId[] = [],
    version: number = 1
  ) {
    super(id);
    this._tenantId = tenantId;
    this._name = name;
    this._description = description;
    this._parentRoleId = parentRoleId;
    this._permissionSetIds = new Set(permissionSets);
    this._version = version;
  }

  public static create(
    id: RoleId,
    tenantId: TenantId,
    name: string,
    description: string,
    parentRoleId?: RoleId
  ): Role {
    return new Role(id, tenantId, name, description, parentRoleId);
  }

  public addPermissionSet(permissionSetId: PermissionSetId): void {
    this._permissionSetIds.add(permissionSetId);
    this._version += 1;
    // this.addDomainEvent(new RoleUpdatedEvent(this.id, this._version));
  }

  public removePermissionSet(permissionSetId: PermissionSetId): void {
    this._permissionSetIds.delete(permissionSetId);
    this._version += 1;
  }

  get tenantId(): TenantId { return this._tenantId; }
  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get parentRoleId(): RoleId | undefined { return this._parentRoleId; }
  get permissionSetIds(): ReadonlyArray<PermissionSetId> { return Array.from(this._permissionSetIds); }
  get version(): number { return this._version; }
}
