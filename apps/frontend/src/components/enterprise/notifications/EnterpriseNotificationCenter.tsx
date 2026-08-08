"use client";

import { useRouter } from "next/navigation";
import { CheckCheck } from "lucide-react";
import { EnterpriseScrollArea } from "@/components/enterprise/shell";
import { EnterpriseNotificationFilters } from "./EnterpriseNotificationFilters";
import { EnterpriseNotificationList } from "./EnterpriseNotificationList";
import { EnterpriseNotificationSettings } from "./EnterpriseNotificationSettings";
import { useNotifications } from "./EnterpriseNotificationProvider";

/**
 * The notification center panel — header (title + unread count + mark-all + options), the filter bar,
 * the scrollable grouped list, and a footer link to the full activity view. Rendered inside the
 * header popover; holds no state (everything comes from `useNotifications`).
 */
export function EnterpriseNotificationCenter() {
  const router = useRouter();
  const { unreadCount, markAllRead, setOpen, loading } = useNotifications();

  return (
    <div className="flex max-h-[calc(100vh-4rem)] w-[min(28rem,calc(100vw-1.5rem))] flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 px-4 pb-2.5 pt-3.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <span className="rounded-full bg-primary/12 px-2 py-0.5 text-2xs font-semibold tabular-nums text-primary">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={markAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40"
          >
            <CheckCheck className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
          <EnterpriseNotificationSettings />
        </div>
      </div>

      {/* Filters */}
      <EnterpriseNotificationFilters />

      {/* Scrollable body — self-capping (cap mode) so cards are always clipped + scrolled inside the
          panel, never spilled. Uses the one shared enterprise scrollbar. */}
      <EnterpriseScrollArea
        mode="cap"
        maxHeight="min(28rem, calc(100vh - 13rem))"
        fadeColor="var(--popover)"
      >
        <EnterpriseNotificationList />
      </EnterpriseScrollArea>

      {/* Footer */}
      {!loading && (
        <div className="border-t border-border p-2">
          <button
            type="button"
            onClick={() => { setOpen(false); router.push("/activity"); }}
            className="w-full rounded-lg py-2 text-center text-xs font-semibold text-primary transition-colors hover:bg-primary-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            View all activity
          </button>
        </div>
      )}
    </div>
  );
}
