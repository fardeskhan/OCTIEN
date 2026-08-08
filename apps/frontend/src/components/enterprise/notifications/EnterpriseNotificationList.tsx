"use client";

import { EnterpriseNotificationGroup } from "./EnterpriseNotificationGroup";
import { EnterpriseNotificationEmpty } from "./EnterpriseNotificationEmpty";
import { EnterpriseNotificationLoading } from "./EnterpriseNotificationLoading";
import { useNotifications } from "./EnterpriseNotificationProvider";

/**
 * Renders the notification body: skeletons while loading, a crafted empty state when there is nothing
 * to show for the current filter, otherwise the day-bucketed groups.
 */
export function EnterpriseNotificationList() {
  const { loading, grouped, visible } = useNotifications();

  if (loading) return <EnterpriseNotificationLoading />;
  if (visible.length === 0) return <EnterpriseNotificationEmpty />;

  return (
    <div className="py-1">
      {grouped.map((g) => (
        <EnterpriseNotificationGroup key={g.bucket} bucket={g.bucket} items={g.items} />
      ))}
    </div>
  );
}
