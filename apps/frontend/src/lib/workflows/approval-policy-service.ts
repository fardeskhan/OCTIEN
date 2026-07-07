
import { ApprovalSourceType } from "@prisma/client";

export class ApprovalPolicyService {
  /**
   * Determines if a specific action on an entity requires approval.
   * Currently hardcoded for MVP, but designed to scale via rules engines later.
   */
  static requiresApproval(sourceType: ApprovalSourceType): boolean {
    switch (sourceType) {
      case "SUPPLIER_BILL":
        return true;
      case "SUPPLIER_PAYMENT":
        return true;
      default:
        return false; // Other entities do not strictly require approval in MVP
    }
  }
}

