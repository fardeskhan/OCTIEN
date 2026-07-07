import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';

export class Department extends Entity<string> {
  constructor(
    id: string,
    public name: string,
    public managerId: string | null
  ) {
    super(id);
  }
}

export class Branch extends Entity<string> {
  private departments: Department[] = [];

  constructor(
    id: string,
    public name: string,
    public addressId: string | null
  ) {
    super(id);
  }

  public addDepartment(dept: Department): void {
    this.departments.push(dept);
  }
}

export class OrganizationStructure extends AggregateRoot<string> {
  private branches: Branch[] = [];

  private constructor(
    id: string,
    public readonly businessId: string
  ) {
    super(id);
  }

  public static create(id: string, businessId: string): OrganizationStructure {
    return new OrganizationStructure(id, businessId);
  }

  public addBranch(branch: Branch): void {
    this.branches.push(branch);
  }

  public getBranches(): Branch[] {
    return [...this.branches];
  }
}
