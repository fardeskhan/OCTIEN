# ADR-PLATFORM-001: Future Multi-Tenant User Strategy

## Status
Approved (Provisional for Entosyst SaaS Evolution)

## Context
In COSMY ERP V1, users inherently belong to the single "COSMY Group" tenant. Thus, a `tenantId` exists on the `User` record.
However, as the system evolves into the multi-tenant Entosyst SaaS platform, users will need to belong to *multiple* tenants through cross-tenant invitations.

## Decision
We mandate that the `Membership` aggregate is the sole authoritative bridge between a `User` and any business or tenant context.

Currently:
`User` → `Membership` → `Business` → `Tenant`

For future SaaS:
The `tenantId` hardcoded on the `User` model will be migrated out or treated strictly as the "Home Tenant". Cross-tenant access will be exclusively resolved via `Membership` records pointing to businesses in other tenants.

## Consequences
- Do **not** hardcode queries assuming `User.tenantId == Business.tenantId`.
- Always verify access via the `Membership` aggregate (e.g. `userId + businessId`).
