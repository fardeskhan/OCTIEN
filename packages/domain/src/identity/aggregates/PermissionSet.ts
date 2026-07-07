import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { PermissionSetId } from '../value-objects/PermissionSetId';
import { Permission } from '../value-objects/Permission';

export class PermissionSet extends AggregateRoot<PermissionSetId> {
  private _tenantId: TenantId;
  private _name: string;
  private _description: string;
  private _permissions: Set<string>; // Storing as string representations of the hierarchical Permission VO (e.g. Sales.Order.*)

  private constructor(
    id: PermissionSetId,
    tenantId: TenantId,
    name: string,
    description: string,
    permissions: string[] = []
  ) {
    super(id);
    this._tenantId = tenantId;
    this._name = name;
    this._description = description;
    this._permissions = new Set(permissions);
  }

  public static create(
    id: PermissionSetId,
    tenantId: TenantId,
    name: string,
    description: string
  ): PermissionSet {
    return new PermissionSet(id, tenantId, name, description);
  }

  public addPermission(permission: Permission): void {
    this._permissions.add(permission.value);
  }

  public removePermission(permission: Permission): void {
    this._permissions.delete(permission.value);
  }

  get tenantId(): TenantId { return this._tenantId; }
  get name(): string { return this._name; }
  get description(): string { return this._description; }
  get permissions(): ReadonlyArray<string> { return Array.from(this._permissions); }
}
