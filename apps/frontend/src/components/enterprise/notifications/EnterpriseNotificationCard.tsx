"use client";

import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useNotifications } from "./EnterpriseNotificationProvider";
import {
  type AppNotification,
  type NotificationAction,
  severityConfig,
  typeIcon,
  fallbackIcon,
  relativeTime,
} from "./lib/notifications";

/**
 * A single notification row. Pure presentation — every mutation is delegated to the platform
 * (`useNotifications`). Actions are config-driven (`notification.actions`); Open/Approve/View/Retry
 * navigate or run a client handler, then close the panel and mark the item read.
 */
export function EnterpriseNotificationCard({ n }: { n: AppNotification }) {
  const router = useRouter();
  const { markRead, toggleRead, dismiss, setOpen } = useNotifications();
  const sev = severityConfig[n.severity];
  const Icon = n.icon ?? typeIcon[n.type] ?? fallbackIcon;

  function runAction(a: NotificationAction) {
    markRead(n.id);
    if (a.run) {
      void a.run();
    } else if (a.href) {
      setOpen(false);
      router.push(a.href);
    }
  }

  function openPrimary() {
    if (!n.href) return;
    markRead(n.id);
    setOpen(false);
    router.push(n.href);
  }

  // A persistent colored rail for high-severity items; otherwise a primary rail only while unread.
  const railClass = sev.emphasis ? sev.accent : !n.read ? "bg-primary" : null;

  return (
    <div
      role="listitem"
      className={cn(
        "group/notif relative flex gap-3.5 rounded-xl px-4 py-3.5 transition-colors duration-150",
        "hover:bg-accent/50 focus-within:bg-accent/50",
        !n.read && "bg-primary-subtle/30",
      )}
    >
      {/* Severity / unread rail */}
      {railClass && <span aria-hidden="true" className={cn("absolute inset-y-2.5 left-0 w-[3px] rounded-full", railClass)} />}

      {/* Severity-tinted type icon */}
      <div className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg", sev.tint)}>
        <Icon className={cn("size-[1.125rem]", sev.color)} aria-hidden="true" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2.5">
          <button
            type="button"
            onClick={openPrimary}
            disabled={!n.href}
            className={cn(
              "min-w-0 flex-1 text-left text-sm font-semibold leading-snug text-foreground",
              n.href && "hover:text-primary focus-visible:text-primary focus-visible:outline-none",
              "disabled:cursor-default",
            )}
          >
            {n.title}
          </button>
          <time className="mt-px shrink-0 text-2xs tabular-nums text-muted-foreground" dateTime={n.timestamp}>
            {relativeTime(n.timestamp)}
          </time>
        </div>

        {n.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{n.description}</p>
        )}

        {/* Meta row */}
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-2xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
            <span className={cn("size-1.5 rounded-full", sev.dot)} aria-hidden="true" />
            <span className="sr-only">{sev.label}. </span>
            {n.type}
          </span>
          {n.business && (<><span aria-hidden="true" className="text-border-strong">·</span><span>{n.business}</span></>)}
          {n.actor && (<><span aria-hidden="true" className="text-border-strong">·</span><span className="truncate">{n.actor}</span></>)}
        </div>

        {/* Actions */}
        {n.actions && n.actions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {n.actions.map((a) => (
              <Button
                key={a.id}
                variant={a.kind === "primary" ? "default" : a.kind === "destructive" ? "destructive" : "outline"}
                className="h-7 rounded-lg px-3 text-xs shadow-xs"
                onClick={() => runAction(a)}
              >
                {a.label}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Hover controls: mark read/unread + dismiss */}
      <div className="absolute right-2.5 top-2.5 flex items-center gap-0.5 rounded-lg border border-border bg-card/90 p-0.5 opacity-0 shadow-xs backdrop-blur transition-opacity duration-150 focus-within:opacity-100 group-hover/notif:opacity-100">
        <Button
          size="icon"
          variant="ghost"
          className="size-6 rounded-md text-muted-foreground hover:text-foreground"
          onClick={() => toggleRead(n.id)}
          aria-label={n.read ? "Mark as unread" : "Mark as read"}
          title={n.read ? "Mark as unread" : "Mark as read"}
        >
          <Check className="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="size-6 rounded-md text-muted-foreground hover:text-foreground"
          onClick={() => dismiss(n.id)}
          aria-label="Dismiss notification"
          title="Dismiss"
        >
          <X className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
