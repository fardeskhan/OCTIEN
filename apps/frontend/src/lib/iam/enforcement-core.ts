/**
 * OCTIEN IAM — enforcement reconciliation core (PURE; 3A canary). No imports, no side effects.
 *
 * Safe-canary rule: **legacy is the fallback authority**. OCTIEN can only AGREE with legacy; on a
 * mismatch or an OCTIEN error the legacy decision is used. Therefore the final enforced decision
 * always equals the legacy decision during the initial canary — no OCTIEN failure can ever lock a
 * legitimate user out. (True OCTIEN-authoritative override is a later, separately-approved step.)
 */
export type Effect = "ALLOW" | "DENY";
export type FallbackReason = "octien-error" | "mismatch" | null;
export interface Reconciliation {
  final: Effect;
  fallbackReason: FallbackReason;
}

/** Reconcile the legacy and OCTIEN decisions. `octien === null` means OCTIEN failed to decide. */
export function reconcile(legacy: Effect, octien: Effect | null): Reconciliation {
  if (octien === null) return { final: legacy, fallbackReason: "octien-error" };
  if (octien === legacy) return { final: legacy, fallbackReason: null };
  return { final: legacy, fallbackReason: "mismatch" };
}
