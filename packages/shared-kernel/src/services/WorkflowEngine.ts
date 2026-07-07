export interface WorkflowContext {
  workflowId: string;
  originatingCapability: string;
  entityId: string;
  metadata: Record<string, any>;
}

export type WorkflowState = 
  | 'PendingApproval'
  | 'InReview'
  | 'Escalated'
  | 'Delegated'
  | 'Approved'
  | 'Rejected'
  | 'Cancelled'
  | 'Compensated'
  | 'TimedOut';

/**
 * Unified Workflow Engine Interface.
 * Used universally across Finance, HR, Purchasing, and Sales.
 */
export interface WorkflowEngine {
  startApprovalProcess(context: WorkflowContext, requiredRole: string): Promise<string>;
  
  review(workflowId: string, reviewerId: string, comments: string): Promise<void>;
  approve(workflowId: string, approverId: string): Promise<void>;
  reject(workflowId: string, rejectorId: string, reason: string): Promise<void>;
  
  escalate(workflowId: string, targetRole: string): Promise<void>;
  delegate(workflowId: string, targetUserId: string): Promise<void>;
  
  cancel(workflowId: string, reason: string): Promise<void>;
  triggerCompensation(workflowId: string): Promise<void>; // e.g. Rollback reservations
  
  getState(workflowId: string): Promise<WorkflowState>;
}
