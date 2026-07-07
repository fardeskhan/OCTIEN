import { Journal } from '../aggregates/Journal';

export interface ApprovalChainRule {
  minAmount: number;
  maxAmount: number | null;
  requiredRoles: string[];
  autoApprove: boolean;
}

/**
 * Domain Service: Approval Policy Engine
 * Dynamically evaluates incoming Journals against tenant-specific hierarchical approval rules.
 */
export class ApprovalPolicyEngine {
  constructor(private readonly tenantConfig: any) {}

  public evaluateJournal(journal: Journal): { requiredApprovers: string[], isAutoApproved: boolean } {
    let maxBaseAmount = 0;
    
    for (const line of journal.lines) {
      if (line.isDebit && line.baseAmount > maxBaseAmount) {
        maxBaseAmount = line.baseAmount;
      }
    }

    // Fetch tenant-specific policy hierarchy
    const policies: ApprovalChainRule[] = this.tenantConfig.getApprovalPolicies(journal.tenantId);

    for (const rule of policies) {
      if (maxBaseAmount >= rule.minAmount && (rule.maxAmount === null || maxBaseAmount <= rule.maxAmount)) {
        return {
          requiredApprovers: rule.requiredRoles,
          isAutoApproved: rule.autoApprove
        };
      }
    }

    // Failsafe: Require CFO approval if no matching brackets are found
    return { requiredApprovers: ['CFO'], isAutoApproved: false };
  }
}
