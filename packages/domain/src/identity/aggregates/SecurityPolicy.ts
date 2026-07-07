import { AggregateRoot } from '../../../shared-kernel/src/domain/AggregateRoot';
import { TenantId } from '../../../shared-kernel/src/domain/value-objects/TenantId';
import { SecurityPolicyId } from '../value-objects/SecurityPolicyId';
import { Permission } from '../value-objects/Permission';

export enum PolicyDecision {
  Allow = 'ALLOW',
  Deny = 'DENY'
}

export interface PolicyCondition {
  field: string;     // e.g., 'BranchMatch', 'ApprovalLimit', 'BusinessHours'
  operator: string;  // e.g., 'EQUALS', 'GREATER_THAN', 'IN_RANGE'
  value: any;        // The contextual requirement
}

export class SecurityPolicy extends AggregateRoot<SecurityPolicyId> {
  private _tenantId: TenantId;
  private _targetPermission: Permission;
  private _conditions: PolicyCondition[];
  private _decision: PolicyDecision;

  private constructor(
    id: SecurityPolicyId,
    tenantId: TenantId,
    targetPermission: Permission,
    conditions: PolicyCondition[],
    decision: PolicyDecision
  ) {
    super(id);
    this._tenantId = tenantId;
    this._targetPermission = targetPermission;
    this._conditions = conditions;
    this._decision = decision;
  }

  public static create(
    id: SecurityPolicyId,
    tenantId: TenantId,
    targetPermission: Permission,
    decision: PolicyDecision = PolicyDecision.Allow
  ): SecurityPolicy {
    return new SecurityPolicy(id, tenantId, targetPermission, [], decision);
  }

  public addCondition(condition: PolicyCondition): void {
    this._conditions.push(condition);
  }

  get tenantId(): TenantId { return this._tenantId; }
  get targetPermission(): Permission { return this._targetPermission; }
  get conditions(): ReadonlyArray<PolicyCondition> { return this._conditions; }
  get decision(): PolicyDecision { return this._decision; }
}
