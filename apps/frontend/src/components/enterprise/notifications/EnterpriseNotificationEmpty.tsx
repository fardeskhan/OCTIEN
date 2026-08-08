"use client";

import { BellOff, CheckCheck, Inbox, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./EnterpriseNotificationProvider";

/**
 * Crafted empty state — the copy and icon adapt to *why* the list is empty (a filter with no matches
 * vs. a genuinely clear inbox vs. no unread items), so it never reads as a generic "nothing here".
 */
export function EnterpriseNotificationEmpty() {
  const { filter, all, resetFilter } = useNotifications();

  const filtered = filter.view !== "all" || filter.type !== null || filter.business !== null;

  let Icon = Inbox;
  let title = "You're all caught up";
  let body = "New notifications from across OCTIEN will appear here.";

  if (filtered && all.length > 0) {
    Icon = BellOff;
    title = "Nothing matches these filters";
    body = "Try clearing the filters to see everything in your inbox.";
  } else if (filter.view === "unread") {
    Icon = CheckCheck;
    title = "No unread notifications";
    body = "Every notification has been read. Nice and tidy.";
  } else if (filter.view === "critical") {
    Icon = ShieldCheck;
    title = "No critical alerts";
    body = "Nothing needs your urgent attention right now.";
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted/40">
        <Icon className="size-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <p className="mt-3.5 text-sm font-medium text-foreground">{title}</p>
      <p className="mt-1 max-w-[17rem] text-xs leading-relaxed text-muted-foreground">{body}</p>
      {filtered && all.length > 0 && (
        <Button variant="outline" size="sm" className="mt-4 h-8 text-xs" onClick={resetFilter}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
