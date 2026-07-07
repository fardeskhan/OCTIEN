# COSMY-BOS: Architectural Foundation

This document serves as the constitutional baseline for the entire COSMY ERP ecosystem, anchored by the **CAP-FINANCE V1.0** core. 

Any modification to the rules below compromises the mathematical determinism of the platform. They are immutable and require formal Architecture Board approval to alter.

---

## 1. Financial Truth Rules
Operational modules (e.g., CAP-PROCURE, CAP-SALES, CAP-PEOPLE) are strictly isolated from the ledger.
- **Rule**: Actuals originate from the General Ledger **only**.
- **Rule**: Budgets and Forecasts **never** write to the GL.
- **Rule**: Consolidation **never** creates operational transactions.
- **Governing ADR**: ADR-005 Consolidation Strategy
- **Certification**: V1.0 System Certification

## 2. Replay & Determinism Rules
The platform is built on Event Sourcing and must be capable of absolute bitemporal recreation.
- **Rule**: No hidden state. The platform state is entirely derivative of the event log.
- **Rule**: No mutable versions. If an aggregate changes, a new version is created.
- **Rule**: No runtime formula mutation (FP&A).
- **Rule**: No non-replayable calculations (e.g., `Date.now()` inside a domain model).
- **Governing ADR**: ADR-001 Event Sourcing Strategy & ADR-007 Deterministic Forecasting Rules
- **Certification**: Replay Certification Matrix

## 3. Snapshot Rules
Financial commitments require cryptographic permanence.
- **Rule**: Every bounded context generating an immutable output must adhere to the standard Snapshot pattern.
- **Pipeline**: `Source Events -> Projection -> Snapshot -> Checksum`
- **Governing ADR**: ADR-004 Snapshot Architecture
- **Certification**: Snapshot Chain Certification

## 4. Cross-Domain Consistency Rules
The architecture guarantees strict mathematical parity across bounded contexts.
- **Rule**: `Inventory Valuation === GL Inventory Asset`
- **Rule**: `Tax Liability === GL Tax Accounts`
- **Rule**: `Asset Valuation === GL Fixed Asset Accounts`
- **Rule**: `ActualVsBudget.actual === Reporting Actuals`
- **Rule**: `Consolidated TB === Consolidated Statements`
- **Rule**: `Forecast Outputs === Forecast Snapshot Inputs`
- **Governing ADR**: ADR-002 CQRS Projection Model
- **Certification**: Cross-Domain Consistency Certification

## 5. ACL & Integration Rules
To protect the core, all operational events must be translated before hitting the finance engine.
- **Rule**: No operational domain is permitted to write directly to the GL.
- **Pipeline**: `Business Event -> ACL -> Financial Intent -> AccountingIntegrationEvent`
- **Governing ADR**: ADR-003 Accounting Integration Layer
- **Certification**: Platform Accounting Contract Verification

## 6. Versioning & Security Rules
- **Rule**: Formula evaluations must use AST parsing; arbitrary code execution (`eval`) is strictly prohibited.
- **Governing ADR**: ADR-006 Formula Engine Design
- **Certification**: Formula Language Boundary Certification

## 7. Operational Truth Rules
Operational domains own activity; Finance owns truth.
- **Rule**: CAP-SALES owns customer activity. Finance owns financial truth. CAP-SALES never writes directly to the GL.
- **Rule**: The exact same separation applies to all future operational domains (CAP-PROCURE, CAP-PEOPLE, etc.).
- **Governing ADR**: ADR-003 Accounting Integration Layer
- **Certification**: Operational Segregation Certification
