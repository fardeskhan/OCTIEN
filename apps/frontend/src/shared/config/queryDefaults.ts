/**
 * Global Query Cache Policies.
 * Ensures consistent stale times across all capabilities preventing cache fragmentation.
 */
export const queryDefaults = {
  dashboard: {
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
  },
  orders: {
    staleTime: 5 * 1000, // 5 seconds
    gcTime: 2 * 60 * 1000,
  },
  customer: {
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 15 * 60 * 1000,
  },
  metadata: {
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 2 * 60 * 60 * 1000,
  },
  health: {
    staleTime: 0, // No cache
    gcTime: 0,
  }
} as const;
