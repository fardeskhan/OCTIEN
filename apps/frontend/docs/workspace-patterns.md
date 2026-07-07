# COSMY BOS Workspace Patterns

To maintain a consistent, high-speed operational experience across COSMY ERP, all modules must strictly adhere to the following UX patterns.

## 1. List View Pattern
Every operational landing page (e.g., /sales/customers, /inventory/products) must follow the standard List View Pattern:
- **Wrapper**: WorkspaceLayout
- **Top Bar**: WorkspaceHeader containing the title, description, and primary page action (e.g., 'New Customer').
- **Filters**: FilterBar immediately below the header.
- **Data**: A full-width DataTable utilizing the remaining vertical space.

## 2. Detail Drawer Pattern (EntityDrawer)
Operational records are inspected via side-drawers (EntityDrawer), preserving the context of the underlying list. 
**Crucial Rule**: Drawers are for **Inspect, Review, Approve, Navigate**, NOT for complex editing. Complex edits should redirect to a dedicated form page or modal.

The standard EntityDrawer layout must contain:
1. **Drawer Header**: Title and primary status badge.
2. **Drawer KPI Strip**: 3-4 micro KPIs summarizing the entity (e.g., Outstanding Balance, Last Order Date).
3. **Tabs**: Standardized navigation (Summary, Activity, Documents, Audit).
4. **Footer Actions**: Primary context actions (e.g., Edit, View Ledger, Approve).

## 3. Filter Pattern & Saved Views
- **Inline Filters**: Filters should be visible and accessible without opening a modal.
- **Saved Views**: The filter bar must support predefined/saved views (e.g., "All", "Open", "Pending", "My Records").

## 4. Bulk Action Pattern
- **Row Selection**: The DataTable must support checkbox row selection.
- **Bulk Action Bar**: Selecting one or more rows reveals a contextual action bar at the top or bottom of the table, allowing operations like Bulk Approve, Delete, or Export.

## 5. Approval Pattern
- Approvals happen inside the EntityDrawer.
- The 'Approve' action should prompt for a confirmation (or PIN, if required by Governance) and immediately refresh the Drawer state and underlying table row.
- Exceptions or failures during approval must surface a clear AlertCard or toast notification.
