"use client";

import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton placeholder that mirrors the card layout (icon, title, body, actions) so the transition
 * from loading to loaded doesn't shift the layout.
 */
export function EnterpriseNotificationLoading() {
  return (
    <div className="space-y-1 px-2 py-2" aria-hidden="true">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3.5 px-4 py-3.5">
          <Skeleton className="size-9 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-8" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
