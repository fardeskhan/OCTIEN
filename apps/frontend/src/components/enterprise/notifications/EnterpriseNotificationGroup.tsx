"use client";

import { EnterpriseNotificationCard } from "./EnterpriseNotificationCard";
import type { AppNotification } from "./lib/notifications";

/**
 * A day bucket (Today / Yesterday / This Week / Earlier) with a sticky label and its cards.
 */
export function EnterpriseNotificationGroup({ bucket, items }: { bucket: string; items: AppNotification[] }) {
  return (
    <section aria-label={bucket} className="pb-1">
      <div className="sticky top-0 z-10 bg-popover/95 px-4 pb-1.5 pt-2.5 backdrop-blur supports-[backdrop-filter]:bg-popover/80">
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{bucket}</h3>
      </div>
      <div role="list" className="space-y-0.5 px-2">
        {items.map((n) => (
          <EnterpriseNotificationCard key={n.id} n={n} />
        ))}
      </div>
    </section>
  );
}
