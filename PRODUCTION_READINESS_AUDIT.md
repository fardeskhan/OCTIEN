# PRODUCTION_READINESS_AUDIT.md

**Date:** 2026-07-11 (Phase 3B refresh) · **Stance:** honest, no inflated numbers. Ratings are **Strong / Adequate / Partial / Weak**, each capped by a concrete gap. (Supersedes the 2026-07-10 draft.)

| Dimension | Rating | Basis | Gap that caps it |
|---|---|---|---|
| **Security** | Adequate | Better Auth; `httpOnly`, `sameSite=lax`, `secure` (prod) cookies; passwords hashed; secrets in `.env`; server actions (built-in origin checks) | No rate-limiting / brute-force protection; no CSP/security-header audit; no 2FA; secrets are `.env` only |
| **RBAC** | Strong (core) / Partial (admin) | `requirePermission`/`requireRole` on server actions **and** pages; 29-permission catalog; `SUPER_ADMIN` bypass; Owner = all | Governance **admin UI** (assign roles/permissions) still mock; permission strings code-defined, not editable in-app |
| **Data Integrity** | Adequate | FK constraints; consistent soft-delete via `deletedAt`; **balanced double-entry GL**; AR/AP/cash ledgers reconcile; invoice lines sum to totals | **Prisma migrations not fully applied** — recent columns via `ALTER TABLE`/`generate` (needs a real `prisma migrate` baseline); no DB-level check constraints |
| **Multi-Tenant Isolation** | Adequate | Every query scoped by `businessId`; `requireBusinessContext` validates membership; tenant→business hierarchy; the `params` data-leak bug is **fixed** | Isolation is **application-enforced** (each query must add `businessId`) — no DB row-level security; one missed filter = leak. Needs a guard/lint or RLS for "Strong" |
| **Audit Trail** | Partial | `AuditLog` model; Prisma extension makes `auditEvent` **append-only** (update/delete blocked) | Most write actions **don't emit audit events yet**; audit-viewing UI is mock |
| **Error Handling** | Adequate | `(dashboard)/error.tsx` boundary; graceful business-context fallback (no crash on missing cookie); server actions throw → toast; empty states throughout | No centralized error reporting; some deep flows lack try/catch around external effects |
| **Logging / Observability** | Weak | Prisma dev query logging; Next request logs | No structured/prod logging, metrics, tracing, or alerting |
| **Finance Reconciliation** | Strong | Trial balance balanced; AR(ledger)=AR(invoices); AP(ledger)=AP(bills); cash ledger = bank position; Balance Sheet A=L+E; Period-Close checklist computes all 6 checks live; **re-verified after dataset expansion (110 invoices, AR ₹35L)** | Manual journal-entry UI and bank-rec import not built; invoice GST is illustrative |
| **Inventory Accuracy** | Partial | On-hand valued at average cost via `inventoryVariantProjection`; **product/variant CRUD real**; valuation reconciles | Projection is **seeded**, not driven by a live stock-movement ledger; adjustments/movements/transfers pages mock — display-accurate, not yet transaction-sourced |

## Genuinely production-grade today
Auth + session + RBAC on the commercial path · double-entry finance reconciling end-to-end · business
management (CRUD + branding, tenant-scoped) · invoice lifecycle (create → pay → void → delete → AR) ·
**logistics (runs/stops/fleet/E-Way) with a provider abstraction** · product→variant workflow.

## Top gaps to reach production (priority)
1. **`prisma migrate` baseline** — replace `generate`+`ALTER` drift with real migrations.
2. **Emit audit events** on writes + wire governance audit/security UI.
3. **Inventory stock-movement ledger** driving projections (+ adjustments/movements/transfers).
4. **Observability** — structured logging, error reporting, metrics.
5. **Isolation hardening** — query guard/lint or DB RLS so no query omits `businessId`.
6. **Security hardening** — rate limiting, security headers/CSP, optional 2FA.
7. **Bank reconciliation + manual journals** UI; real GST computation.
8. **Vertical domains** (UCO / Salam-Cola) or accept demo-through-generic-ERP.

## Honest scores
- **Application stability:** ✅ Pass — 0 crashing routes; Finance Prisma, data-isolation, and the variant-404 all fixed; fresh dev server 0 errors.
- **Client-Demo-Ready:** **~85%** — Business Mgmt, Finance, Procurement, Inventory, Sales, Invoices, Reports,
  and **Logistics/E-Way** run on real, reconciling data without crashes or dead buttons on the core path.
- **Production-Ready:** **~60%** — architecture and commercial core are solid; the gaps above (migrations,
  audit emission, inventory sourcing, observability, isolation hardening, security) are real and must close
  first. Governance admin + bespoke verticals remain.
