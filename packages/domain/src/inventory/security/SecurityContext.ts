export enum InventoryRole {
  InventoryAdmin = 'InventoryAdmin',
  InventoryManager = 'InventoryManager',
  InventoryOperator = 'InventoryOperator',
  InventoryViewer = 'InventoryViewer'
}

export interface SecurityPrincipal {
  userId: string;
  roles: InventoryRole[];
  tenantId: string; // Tenant isolation guaranteed at the principal level
  tokenContext: any; // e.g. JWT claims
}

export class SecurityContext {
  private static currentUserContext = new Map<string, SecurityPrincipal>(); // Stub for AsyncLocalStorage

  public static setPrincipal(correlationId: string, principal: SecurityPrincipal): void {
    this.currentUserContext.set(correlationId, principal);
  }

  public static getPrincipal(correlationId: string): SecurityPrincipal {
    const principal = this.currentUserContext.get(correlationId);
    if (!principal) throw new Error("Security Context Not Found: Unauthorized");
    return principal;
  }

  public static authorize(correlationId: string, requiredRoles: InventoryRole[]): void {
    const principal = this.getPrincipal(correlationId);
    const hasRole = principal.roles.some(role => requiredRoles.includes(role));
    if (!hasRole) {
      throw new Error(`Authorization Failed: Principal ${principal.userId} lacks required roles.`);
    }
  }

  public static assertTenantIsolation(correlationId: string, targetTenantId: string): void {
    const principal = this.getPrincipal(correlationId);
    if (principal.tenantId !== targetTenantId) {
      throw new Error(`Tenant Isolation Violation: Principal from ${principal.tenantId} attempted to access ${targetTenantId}`);
    }
  }
}
