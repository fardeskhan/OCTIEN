/**
 * Formalizes exactly what Context IRIS requires to prevent hallucinations 
 * and restrict AI from bypassing application permissions.
 */
export interface ContextualIrisMetadata {
  capability: string;         // e.g., 'Sales'
  entityType: string;         // e.g., 'CustomerOrder'
  entityId: string;           // e.g., 'ord_123'
  permissions: string[];      // The user's active claims
  currentProjectionVersion: number;
  availableCommands: string[]; // Commands the UI is currently allowing
  availableQueries: string[];  // Safe read endpoints IRIS can invoke
  availableDocuments: string[];// Associated doc links
  workflowState: string;       // e.g., 'Pending Approval'
}
