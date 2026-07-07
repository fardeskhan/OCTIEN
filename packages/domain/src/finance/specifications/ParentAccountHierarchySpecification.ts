import { ChartOfAccounts } from '../../aggregates/ChartOfAccounts';

export class ParentAccountHierarchySpecification {
  isSatisfiedBy(chart: ChartOfAccounts, accountId: string, desiredParentId: string): { isValid: boolean; errors: string[] } {
    let currentParent: string | undefined = desiredParentId;
    
    // Acyclic traversal check
    while (currentParent) {
      if (currentParent === accountId) {
        return { isValid: false, errors: [`Hierarchy cycle detected. Account ${accountId} cannot be an ancestor of itself.`] };
      }
      const parentNode = chart.getAccount(currentParent);
      currentParent = parentNode?.parentAccountId;
    }
    
    return { isValid: true, errors: [] };
  }
}
