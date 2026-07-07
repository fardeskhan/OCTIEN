export interface CapabilityDiagnosticResult {
  status: 'PASS' | 'WARN' | 'FAIL';
  details: Record<string, any>;
}

/**
 * CapabilityFacade
 * The absolute and only boundary a capability exposes to the rest of the platform.
 * All internal commands, queries, repositories, and services must remain private.
 */
export interface CapabilityFacade {
  execute(commandName: string, payload: any): Promise<void>;
  query(queryName: string, payload: any): Promise<any>;
  metadata(): any;
  
  // Platform Diagnostics Integration
  health(): Promise<CapabilityDiagnosticResult>;      // Liveness only
  readiness(): Promise<CapabilityDiagnosticResult>;   // Dependencies (DB, Redis, etc)
  diagnostics(): Promise<CapabilityDiagnosticResult>; // Metrics export
  selfTest(): Promise<CapabilityDiagnosticResult>;    // Deep logic validation
}
