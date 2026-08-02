import * as React from "react";

/**
 * Client-side permission gate for UI affordances (buttons, menu items, columns).
 *
 * This is a UX convenience only — it hides controls the user can't use. Real enforcement is
 * ALWAYS the server action's `requirePermission(...)`; never rely on this for security.
 *
 * Pass the permission list the page already loaded (the dashboard layout resolves it per
 * business). A wildcard "*" grants everything (super-admin).
 */
export function EnterprisePermissionGuard({
  granted,
  permission,
  fallback = null,
  children,
}: {
  granted: string[];
  /** Single permission, or an array — the user needs ANY of them. */
  permission: string | string[];
  fallback?: React.ReactNode;
  children: React.ReactNode;
}) {
  const needed = Array.isArray(permission) ? permission : [permission];
  const allowed = granted.includes("*") || needed.some((p) => granted.includes(p));
  return <>{allowed ? children : fallback}</>;
}
