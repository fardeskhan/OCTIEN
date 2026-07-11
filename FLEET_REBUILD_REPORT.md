# FLEET_REBUILD_REPORT.md

**Date:** 2026-07-11 · **Browser-verified live** (authenticated session).

## Working today (real data)
- **Vehicles:** registration, type, transporter, capacity, **live status** (Assigned 4/5, Available) derived
  from active delivery-run assignment.
- **Drivers:** name, phone, licence, default vehicle, **live status** (On Route 4/5, Available).
- **Transporters:** code, GSTIN, contact.
- KPIs show assigned/on-route ratios; all statuses recompute per request.

## Honest gaps (need schema additions — small, but schema work)
- Explicit driver states **Off Duty / Leave** and vehicle states **Maintenance** (currently derived binary
  Available/Busy; needs a `status` column on Driver/Vehicle + a toggle UI).
- **Maintenance log, fuel tracking, utilization %, driver performance scores** — no models yet; these are the
  next fleet iteration, listed as roadmap rather than claimed.
- Route allocation exists implicitly (runs reference driver+vehicle); a drag-assign UI is not built.
