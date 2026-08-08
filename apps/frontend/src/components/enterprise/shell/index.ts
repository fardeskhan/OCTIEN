/**
 * OCTIEN application shell — reusable, module-agnostic. Every navigation surface is generated from
 * `@/lib/navigation`; the shell knows nothing about Sales/Procurement/Inventory/etc.
 */
export { EnterpriseShell } from "./EnterpriseShell";
export { EnterpriseSidebar } from "./EnterpriseSidebar";
export { EnterpriseTopbar } from "./EnterpriseTopbar";
export { EnterpriseBreadcrumb } from "./EnterpriseBreadcrumb";
export { EnterpriseWorkspaceSwitcher, type ShellBusiness } from "./EnterpriseWorkspaceSwitcher";
export { EnterpriseScrollArea } from "./EnterpriseScrollArea";
export { EnterpriseQuickActions } from "./EnterpriseQuickActions";
export { EnterpriseUserMenu } from "./EnterpriseUserMenu";
export { EnterpriseThemeSwitcher } from "./EnterpriseThemeSwitcher";
export { useFavorites } from "./hooks/useFavorites";
export { useRecent, useTrackRecent } from "./hooks/useRecent";
export { useNavigationSearch } from "./hooks/useNavigationSearch";
export { useSidebar } from "./hooks/useSidebar";
