import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { OrganizationUnitId } from '../value-objects/OrganizationUnitId';

export class OrganizationUnit extends AggregateRoot<OrganizationUnitId> {
  private _tenantId: TenantId;
  private _name: string;
  private _type: string; // e.g., 'Company', 'Branch', 'Department', 'Warehouse'
  private _parentUnitId?: OrganizationUnitId;

  private constructor(
    id: OrganizationUnitId,
    tenantId: TenantId,
    name: string,
    type: string,
    parentUnitId?: OrganizationUnitId
  ) {
    super(id);
    this._tenantId = tenantId;
    this._name = name;
    this._type = type;
    this._parentUnitId = parentUnitId;
  }

  public static create(
    id: OrganizationUnitId,
    tenantId: TenantId,
    name: string,
    type: string,
    parentUnitId?: OrganizationUnitId
  ): OrganizationUnit {
    return new OrganizationUnit(id, tenantId, name, type, parentUnitId);
  }

  get tenantId(): TenantId { return this._tenantId; }
  get name(): string { return this._name; }
  get type(): string { return this._type; }
  get parentUnitId(): OrganizationUnitId | undefined { return this._parentUnitId; }
}
