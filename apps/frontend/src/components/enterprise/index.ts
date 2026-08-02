/**
 * OCTIEN Enterprise design system — the single import surface for every module's CRUD screens.
 *
 * Organized into domains (data / feedback / forms / layout / security). Most exports are
 * re-exports of already-battle-tested components (the shared DataTable used by 40+ pages, the
 * workspace layout, KPI card, audit timeline, badge) so we get a consistent, discoverable API
 * WITHOUT duplicating implementations. The genuinely-new pieces live in the sub-folders.
 *
 * Prefer importing from a sub-path (`@/components/enterprise/feedback`) in large files, or from
 * the root (`@/components/enterprise`) for convenience.
 *
 * Standard CRUD page composition:
 *   <EnterprisePageHeader /> → <EnterpriseKPIRow /> → <EnterpriseFilterBar /> → <EnterpriseDataTable />
 */

export * from "./data";
export * from "./feedback";
export * from "./forms";
export * from "./layout";
export * from "./security";

// Audit trail (lives under governance; surfaced here for the design system).
export { AuditTimeline as EnterpriseAuditTimeline } from "@/components/governance/audit-timeline";
export type { AuditEvent } from "@/components/governance/audit-timeline";

// Print control.
export { EnterprisePrintButton } from "./print-button";

// Reporting framework.
export { EnterpriseReportLayout } from "./report-layout";
export { EnterpriseReportTable } from "./report-table";
export type { ReportColumn, ReportRow } from "./report-table";
