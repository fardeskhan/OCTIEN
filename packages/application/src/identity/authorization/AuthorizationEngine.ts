import { PermissionResolver } from './PermissionResolver';
import { RoleResolver } from './RoleResolver';
import { PolicyEngine } from './PolicyEngine';
import { DecisionCache } from './DecisionCache';
import { AuditEmitter } from './AuditEmitter';

export class AuthorizationEngine {
  constructor(
    private readonly permissionResolver: PermissionResolver,
    private readonly roleResolver: RoleResolver,
    private readonly policyEngine: PolicyEngine,
    private readonly decisionCache: DecisionCache,
    private readonly auditEmitter: AuditEmitter
  ) {}

  public async evaluate(userId: string, action: string, resource: string, context: any): Promise<boolean> {
    const cacheKey = `${userId}:${action}:${resource}`;
    const cached = await this.decisionCache.get(cacheKey);
    if (cached !== undefined) return cached;

    const roles = await this.roleResolver.resolve(userId);
    const permissions = await this.permissionResolver.resolve(roles);
    
    const decision = await this.policyEngine.decide(permissions, action, resource, context);
    
    await this.decisionCache.set(cacheKey, decision);
    await this.auditEmitter.emitEvaluation(userId, action, resource, decision);

    return decision;
  }
}
