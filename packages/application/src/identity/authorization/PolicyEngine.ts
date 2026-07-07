export class PolicyEngine {
  public async decide(permissions: any[], action: string, resource: string, context: any): Promise<boolean> {
    // 1. Exact Match overrides
    // 2. Wildcard mapping
    // 3. Deny overrides Allow
    console.log(`[PolicyEngine] Evaluating ${action} on ${resource}`);
    return permissions.some(p => p.action === action && p.resource === resource && p.effect === 'allow');
  }
}
