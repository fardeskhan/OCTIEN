# OCTIEN IAM — Pre-Apply Database Baseline (READ ONLY)

> **Immutable baseline** captured before applying `001_expand.sql`. Read-only transaction; DB unmodified.
> Generated: 2026-08-10T12:36:30.136Z
> Host: `<redacted-neon-host>` · Database: `neondb` · Schema: `public` · Server: PostgreSQL 18.4 (be2730e)

```
PostgreSQL 18.4 (be2730e) on aarch64-unknown-linux-gnu, compiled by gcc (Ubuntu 13.3.0-6ubuntu2~24.04.1) 13.3.0, 64-bit
```

## 1. Table inventory

Total BASE TABLEs in `public`: **107**
Existing `iam_*` tables (expected NONE pre-apply): **0** ✔

<details><summary>All tables</summary>

- BankAccount
- BankReconciliationSession
- BankReconciliationSummary
- BankStatement
- BankTransaction
- BankTransactionMatch
- EInvoice
- accounting_periods
- accounts
- approval_action
- approval_request
- asset_acquisitions
- asset_assignments
- asset_categories
- asset_disposals
- asset_locations
- audit_events
- audit_logs
- batches
- budget_lines
- budgets
- business_types
- businesses
- cash_transactions
- categories
- compliance_jobs
- cost_center_assignments
- cost_centers
- currencies
- customer_addresses
- customer_contacts
- customer_invoice_lines
- customer_invoices
- customer_payment_allocations
- customer_payments
- customers
- delivery_notes
- delivery_run_stops
- delivery_runs
- depreciation_schedules
- document_attachment
- drivers
- eway_bills
- expense_categories
- financial_periods
- fixed_assets
- goods_receipt_lines
- goods_receipt_requests
- gstr1_summaries
- gstr2b_reconciliation_items
- gstr3b_summaries
- hsn_sac_codes
- inventory
- inventory_dashboard_projection
- inventory_variant_projection
- journal_entries
- journal_lines
- ledger_accounts
- manufacturing_batches
- memberships
- movement_timeline_projection
- outbox_events
- payable_entries
- payment_allocations
- permissions
- product_variants
- products
- purchase_order_lines
- purchase_orders
- purchase_requisition_lines
- purchase_requisitions
- quotation_lines
- quotations
- receivable_entries
- recurring_commitments
- reporting_executive_dashboard
- reporting_inventory_snapshot
- reporting_procurement_snapshot
- reporting_sales_snapshot
- reporting_supplier_performance
- reservations
- role_permissions
- roles
- sales_order_lines
- sales_orders
- sales_return_lines
- sales_returns
- sessions
- shipment_lines
- shipments
- stock_movements
- supplier_bill_lines
- supplier_bills
- supplier_contacts
- supplier_payments
- suppliers
- tax_groups
- tax_periods
- tax_rates
- tax_snapshots
- tenants
- transporters
- units
- users
- vehicles
- verifications
- warehouses

</details>

## 2. Legacy IAM / auth row counts (the numbers backfill parity will be checked against)

| Table | Rows |
|---|---|
| `users` | 2 |
| `roles` | 2 |
| `permissions` | 29 |
| `role_permissions` | 29 |
| `memberships` | 4 |
| `tenants` | 2 |
| `businesses` | 3 |
| `business_types` | 1 |
| `sessions` | 40 |
| `accounts` | 2 |
| `verifications` | 0 |
| `audit_logs` | 22 |
| `audit_events` | 79 |

## 3. Indexes on legacy IAM/auth tables

```
accounts.accounts_pkey: CREATE UNIQUE INDEX accounts_pkey ON public.accounts USING btree (id)
audit_events.audit_events_businessId_createdAt_idx: CREATE INDEX "audit_events_businessId_createdAt_idx" ON public.audit_events USING btree ("businessId", "createdAt")
audit_events.audit_events_businessId_entityType_entityId_idx: CREATE INDEX "audit_events_businessId_entityType_entityId_idx" ON public.audit_events USING btree ("businessId", "entityType", "entityId")
audit_events.audit_events_correlationId_idx: CREATE INDEX "audit_events_correlationId_idx" ON public.audit_events USING btree ("correlationId")
audit_events.audit_events_pkey: CREATE UNIQUE INDEX audit_events_pkey ON public.audit_events USING btree (id)
audit_logs.audit_logs_businessId_occurredAt_idx: CREATE INDEX "audit_logs_businessId_occurredAt_idx" ON public.audit_logs USING btree ("businessId", "occurredAt")
audit_logs.audit_logs_pkey: CREATE UNIQUE INDEX audit_logs_pkey ON public.audit_logs USING btree (id)
audit_logs.audit_logs_tenantId_occurredAt_idx: CREATE INDEX "audit_logs_tenantId_occurredAt_idx" ON public.audit_logs USING btree ("tenantId", "occurredAt")
business_types.business_types_name_key: CREATE UNIQUE INDEX business_types_name_key ON public.business_types USING btree (name)
business_types.business_types_pkey: CREATE UNIQUE INDEX business_types_pkey ON public.business_types USING btree (id)
businesses.businesses_pkey: CREATE UNIQUE INDEX businesses_pkey ON public.businesses USING btree (id)
businesses.businesses_slug_key: CREATE UNIQUE INDEX businesses_slug_key ON public.businesses USING btree (slug)
businesses.businesses_tenantId_idx: CREATE INDEX "businesses_tenantId_idx" ON public.businesses USING btree ("tenantId")
memberships.memberships_pkey: CREATE UNIQUE INDEX memberships_pkey ON public.memberships USING btree (id)
memberships.memberships_userId_businessId_key: CREATE UNIQUE INDEX "memberships_userId_businessId_key" ON public.memberships USING btree ("userId", "businessId")
permissions.permissions_pkey: CREATE UNIQUE INDEX permissions_pkey ON public.permissions USING btree (id)
permissions.permissions_resource_action_key: CREATE UNIQUE INDEX permissions_resource_action_key ON public.permissions USING btree (resource, action)
role_permissions.role_permissions_pkey: CREATE UNIQUE INDEX role_permissions_pkey ON public.role_permissions USING btree (id)
role_permissions.role_permissions_roleId_permissionId_key: CREATE UNIQUE INDEX "role_permissions_roleId_permissionId_key" ON public.role_permissions USING btree ("roleId", "permissionId")
roles.roles_pkey: CREATE UNIQUE INDEX roles_pkey ON public.roles USING btree (id)
roles.roles_tenantId_name_key: CREATE UNIQUE INDEX "roles_tenantId_name_key" ON public.roles USING btree ("tenantId", name)
sessions.sessions_pkey: CREATE UNIQUE INDEX sessions_pkey ON public.sessions USING btree (id)
sessions.sessions_token_key: CREATE UNIQUE INDEX sessions_token_key ON public.sessions USING btree (token)
tenants.tenants_pkey: CREATE UNIQUE INDEX tenants_pkey ON public.tenants USING btree (id)
tenants.tenants_slug_key: CREATE UNIQUE INDEX tenants_slug_key ON public.tenants USING btree (slug)
users.users_email_key: CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email)
users.users_pkey: CREATE UNIQUE INDEX users_pkey ON public.users USING btree (id)
users.users_tenantId_idx: CREATE INDEX "users_tenantId_idx" ON public.users USING btree ("tenantId")
verifications.verifications_pkey: CREATE UNIQUE INDEX verifications_pkey ON public.verifications USING btree (id)
```

## 4. Constraints on legacy IAM/auth tables

| Table | Constraint | Type |
|---|---|---|
| `accounts` | accounts_accountId_not_null | CHECK |
| `accounts` | accounts_createdAt_not_null | CHECK |
| `accounts` | accounts_id_not_null | CHECK |
| `accounts` | accounts_providerId_not_null | CHECK |
| `accounts` | accounts_updatedAt_not_null | CHECK |
| `accounts` | accounts_userId_not_null | CHECK |
| `accounts` | accounts_userId_fkey | FOREIGN KEY |
| `accounts` | accounts_pkey | PRIMARY KEY |
| `audit_events` | audit_events_businessId_not_null | CHECK |
| `audit_events` | audit_events_correlationId_not_null | CHECK |
| `audit_events` | audit_events_createdAt_not_null | CHECK |
| `audit_events` | audit_events_entityId_not_null | CHECK |
| `audit_events` | audit_events_entityType_not_null | CHECK |
| `audit_events` | audit_events_eventType_not_null | CHECK |
| `audit_events` | audit_events_id_not_null | CHECK |
| `audit_events` | audit_events_tenantId_not_null | CHECK |
| `audit_events` | audit_events_pkey | PRIMARY KEY |
| `audit_logs` | audit_logs_action_not_null | CHECK |
| `audit_logs` | audit_logs_actorId_not_null | CHECK |
| `audit_logs` | audit_logs_id_not_null | CHECK |
| `audit_logs` | audit_logs_occurredAt_not_null | CHECK |
| `audit_logs` | audit_logs_resource_not_null | CHECK |
| `audit_logs` | audit_logs_tenantId_not_null | CHECK |
| `audit_logs` | audit_logs_pkey | PRIMARY KEY |
| `business_types` | business_types_createdAt_not_null | CHECK |
| `business_types` | business_types_id_not_null | CHECK |
| `business_types` | business_types_name_not_null | CHECK |
| `business_types` | business_types_pkey | PRIMARY KEY |
| `businesses` | businesses_businessTypeId_not_null | CHECK |
| `businesses` | businesses_createdAt_not_null | CHECK |
| `businesses` | businesses_fiscalYearStartMonth_not_null | CHECK |
| `businesses` | businesses_id_not_null | CHECK |
| `businesses` | businesses_name_not_null | CHECK |
| `businesses` | businesses_slug_not_null | CHECK |
| `businesses` | businesses_status_not_null | CHECK |
| `businesses` | businesses_tenantId_not_null | CHECK |
| `businesses` | businesses_updatedAt_not_null | CHECK |
| `businesses` | businesses_businessTypeId_fkey | FOREIGN KEY |
| `businesses` | businesses_tenantId_fkey | FOREIGN KEY |
| `businesses` | businesses_pkey | PRIMARY KEY |
| `memberships` | memberships_businessId_not_null | CHECK |
| `memberships` | memberships_id_not_null | CHECK |
| `memberships` | memberships_roleId_not_null | CHECK |
| `memberships` | memberships_userId_not_null | CHECK |
| `memberships` | memberships_businessId_fkey | FOREIGN KEY |
| `memberships` | memberships_roleId_fkey | FOREIGN KEY |
| `memberships` | memberships_userId_fkey | FOREIGN KEY |
| `memberships` | memberships_pkey | PRIMARY KEY |
| `permissions` | permissions_action_not_null | CHECK |
| `permissions` | permissions_id_not_null | CHECK |
| `permissions` | permissions_resource_not_null | CHECK |
| `permissions` | permissions_pkey | PRIMARY KEY |
| `role_permissions` | role_permissions_id_not_null | CHECK |
| `role_permissions` | role_permissions_permissionId_not_null | CHECK |
| `role_permissions` | role_permissions_roleId_not_null | CHECK |
| `role_permissions` | role_permissions_permissionId_fkey | FOREIGN KEY |
| `role_permissions` | role_permissions_roleId_fkey | FOREIGN KEY |
| `role_permissions` | role_permissions_pkey | PRIMARY KEY |
| `roles` | roles_id_not_null | CHECK |
| `roles` | roles_isSystem_not_null | CHECK |
| `roles` | roles_name_not_null | CHECK |
| `roles` | roles_tenantId_not_null | CHECK |
| `roles` | roles_tenantId_fkey | FOREIGN KEY |
| `roles` | roles_pkey | PRIMARY KEY |
| `sessions` | sessions_createdAt_not_null | CHECK |
| `sessions` | sessions_expiresAt_not_null | CHECK |
| `sessions` | sessions_id_not_null | CHECK |
| `sessions` | sessions_token_not_null | CHECK |
| `sessions` | sessions_updatedAt_not_null | CHECK |
| `sessions` | sessions_userId_not_null | CHECK |
| `sessions` | sessions_userId_fkey | FOREIGN KEY |
| `sessions` | sessions_pkey | PRIMARY KEY |
| `tenants` | tenants_createdAt_not_null | CHECK |
| `tenants` | tenants_id_not_null | CHECK |
| `tenants` | tenants_name_not_null | CHECK |
| `tenants` | tenants_slug_not_null | CHECK |
| `tenants` | tenants_updatedAt_not_null | CHECK |
| `tenants` | tenants_pkey | PRIMARY KEY |
| `users` | users_createdAt_not_null | CHECK |
| `users` | users_emailVerified_not_null | CHECK |
| `users` | users_email_not_null | CHECK |
| `users` | users_id_not_null | CHECK |
| `users` | users_name_not_null | CHECK |
| `users` | users_tenantId_not_null | CHECK |
| `users` | users_updatedAt_not_null | CHECK |
| `users` | users_tenantId_fkey | FOREIGN KEY |
| `users` | users_pkey | PRIMARY KEY |
| `verifications` | verifications_expiresAt_not_null | CHECK |
| `verifications` | verifications_id_not_null | CHECK |
| `verifications` | verifications_identifier_not_null | CHECK |
| `verifications` | verifications_value_not_null | CHECK |
| `verifications` | verifications_pkey | PRIMARY KEY |

## 5. `reporting_executive_dashboard` current structure (live DB)

| Column | Type | Nullable | Default |
|---|---|---|---|
| id | text | NO |  |
| businessId | text | NO |  |
| totalInventoryVal | double precision | NO | 0.0 |
| openPOAmount | double precision | NO | 0.0 |
| monthlySpend | double precision | NO | 0.0 |
| activeSuppliers | integer | NO | 0 |
| pendingReceipts | integer | NO | 0 |
| lowStockAlerts | integer | NO | 0 |
| snapshotDate | timestamp without time zone | NO | CURRENT_TIMESTAMP |
| updatedAt | timestamp without time zone | NO |  |
| totalinventoryval | real | NO | 0 |
| openpoamount | real | NO | 0 |
| monthlyspend | real | NO | 0 |
| activesuppliers | integer | NO | 0 |
| pendingreceipts | integer | NO | 0 |
| lowstockalerts | integer | NO | 0 |

## 6. Schema drift confirmation (dashboard — SEPARATE from IAM)

Model `ExecutiveDashboardProjection` expects (camelCase): `id`, `businessId`, `totalInventoryVal`, `openPOAmount`, `monthlySpend`, `activeSuppliers`, `pendingReceipts`, `lowStockAlerts`, `snapshotDate`, `updatedAt`

- **In model but MISSING from live DB** (0): none
- **In live DB but NOT in model** (6): `totalinventoryval`, `openpoamount`, `monthlyspend`, `activesuppliers`, `pendingreceipts`, `lowstockalerts`

> This drift is out of scope for the IAM rollout and is tracked as a separate task. Do NOT fix it during IAM deployment.

## 7. `001_expand.sql` additive-only verification (checkpoint step 7)

Executable (non-comment) statement inventory:

| Statement | Count |
|---|---|
| CREATE TABLE (all `iam_*`) | 22 |
| CREATE TYPE (enums) | 9 |
| CREATE INDEX | 18 |
| CREATE UNIQUE INDEX | 12 |
| ALTER TABLE (all `ADD CONSTRAINT` FK on `iam_*`) | 19 |

- **Destructive statements (DROP / ALTER COLUMN / DELETE / TRUNCATE): NONE ✔**
- **Every foreign key `REFERENCES` an `iam_*` table only** — no FK touches any legacy table:
  `iam_departments, iam_entities, iam_entity_templates, iam_locations, iam_modules,
   iam_organizations, iam_permission_groups, iam_principals, iam_projects,
   iam_resource_definitions, iam_scopes, iam_workspaces`.

Conclusion: `001_expand.sql` is **purely additive** and **cannot modify or reference any existing table**.

## 8. Checkpoint result

- Live Neon pilot inventoried **read-only** (READ ONLY transaction, ROLLBACK); **DB unmodified**.
- `iam_*` tables present pre-apply: **0** (clean baseline).
- Legacy IAM/auth row counts recorded above → the **immutable parity reference** for backfill.
- Dashboard drift **precisely confirmed and quarantined** (§6) — the live DB carries BOTH the model's
  camelCase columns *and* six orphaned lowercase duplicates; the model is not missing anything.
- `001_expand.sql` verified additive-only with IAM-local FKs (§7).

**NOT executed:** `001_expand.sql`, `prisma db push`, `prisma migrate deploy`. Awaiting manual review +
backup/recovery confirmation before any apply.
