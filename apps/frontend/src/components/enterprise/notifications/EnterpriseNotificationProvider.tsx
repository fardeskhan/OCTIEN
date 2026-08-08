"use client";

/**
 * Enterprise Notification platform — the state owner. Every piece of notification behavior lives
 * here: loading, unread count, read/unread/all-read, dismissal, filtering, grouping and (optimistic)
 * mutations. UI components are pure renderers that read this context via `useNotifications()` — they
 * hold no notification state of their own. Swap `fetchNotifications` (mock) for a live service and
 * nothing below changes.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  type AppNotification,
  type NotificationType,
  groupByDay,
} from "./lib/notifications";
import { fetchNotifications } from "./lib/mock-notifications";

export type NotificationView = "all" | "unread" | "critical";

export interface NotificationFilter {
  view: NotificationView;
  type: NotificationType | null;
  business: string | null;
}

const DEFAULT_FILTER: NotificationFilter = { view: "all", type: null, business: null };

interface NotificationContextValue {
  /** Raw list (unfiltered), newest-first. */
  all: AppNotification[];
  /** Filtered list per the active filter. */
  visible: AppNotification[];
  /** Filtered + bucketed for rendering. */
  grouped: { bucket: string; items: AppNotification[] }[];
  loading: boolean;
  unreadCount: number;
  criticalCount: number;
  /** Distinct businesses present in the feed (for the Business filter). */
  businesses: string[];

  filter: NotificationFilter;
  setView: (v: NotificationView) => void;
  setType: (t: NotificationType | null) => void;
  setBusiness: (b: string | null) => void;
  resetFilter: () => void;

  markRead: (id: string) => void;
  markUnread: (id: string) => void;
  toggleRead: (id: string) => void;
  markAllRead: () => void;
  dismiss: (id: string) => void;
  refresh: () => void;

  /** Panel open state — the header badge and the center share it. */
  open: boolean;
  setOpen: (o: boolean) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function EnterpriseNotificationProvider({ children }: { children: React.ReactNode }) {
  const [all, setAll] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<NotificationFilter>(DEFAULT_FILTER);
  const [open, setOpen] = useState(false);
  const loadSeq = useRef(0);

  const load = useCallback(() => {
    const seq = ++loadSeq.current;
    setLoading(true);
    fetchNotifications()
      .then((items) => {
        if (seq !== loadSeq.current) return; // ignore stale responses
        setAll(items.sort((a, b) => +new Date(b.timestamp) - +new Date(a.timestamp)));
      })
      .finally(() => {
        if (seq === loadSeq.current) setLoading(false);
      });
  }, []);

  // Initial fetch on mount. `load` sets loading state synchronously before an async request — the
  // intended "fetch on mount" pattern, not a render-sync bug.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  // ── Mutations (optimistic: local state is the source of truth; a service call would go alongside
  //    each of these and roll back on failure). ──────────────────────────────────────────────────
  const patch = useCallback((id: string, fn: (n: AppNotification) => AppNotification) => {
    setAll((prev) => prev.map((n) => (n.id === id ? fn(n) : n)));
  }, []);

  const markRead = useCallback((id: string) => patch(id, (n) => ({ ...n, read: true })), [patch]);
  const markUnread = useCallback((id: string) => patch(id, (n) => ({ ...n, read: false })), [patch]);
  const toggleRead = useCallback((id: string) => patch(id, (n) => ({ ...n, read: !n.read })), [patch]);
  const markAllRead = useCallback(() => setAll((prev) => prev.map((n) => (n.read ? n : { ...n, read: true }))), []);
  const dismiss = useCallback((id: string) => setAll((prev) => prev.filter((n) => n.id !== id)), []);

  const setView = useCallback((view: NotificationView) => setFilter((f) => ({ ...f, view })), []);
  const setType = useCallback((type: NotificationType | null) => setFilter((f) => ({ ...f, type })), []);
  const setBusiness = useCallback((business: string | null) => setFilter((f) => ({ ...f, business })), []);
  const resetFilter = useCallback(() => setFilter(DEFAULT_FILTER), []);

  const unreadCount = useMemo(() => all.reduce((c, n) => c + (n.read ? 0 : 1), 0), [all]);
  const criticalCount = useMemo(() => all.reduce((c, n) => c + (!n.read && n.severity === "critical" ? 1 : 0), 0), [all]);
  const businesses = useMemo(
    () => Array.from(new Set(all.map((n) => n.business).filter((b): b is string => !!b))).sort(),
    [all],
  );

  const visible = useMemo(() => {
    return all.filter((n) => {
      if (filter.view === "unread" && n.read) return false;
      if (filter.view === "critical" && n.severity !== "critical") return false;
      if (filter.type && n.type !== filter.type) return false;
      if (filter.business && n.business !== filter.business) return false;
      return true;
    });
  }, [all, filter]);

  const grouped = useMemo(() => groupByDay(visible), [visible]);

  const value = useMemo<NotificationContextValue>(
    () => ({
      all, visible, grouped, loading, unreadCount, criticalCount, businesses,
      filter, setView, setType, setBusiness, resetFilter,
      markRead, markUnread, toggleRead, markAllRead, dismiss, refresh: load,
      open, setOpen,
    }),
    [all, visible, grouped, loading, unreadCount, criticalCount, businesses, filter,
      setView, setType, setBusiness, resetFilter, markRead, markUnread, toggleRead, markAllRead, dismiss, load, open],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications(): NotificationContextValue {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within <EnterpriseNotificationProvider>");
  return ctx;
}
