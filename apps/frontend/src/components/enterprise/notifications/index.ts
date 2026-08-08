/**
 * Enterprise Notification platform — an application-wide notification system (not a dropdown). Every
 * module publishes into one typed model; the provider owns all state (unread, read/all-read, filters,
 * grouping, optimistic mutations) and the components are pure renderers. Mock source today
 * (`lib/mock-notifications`), swappable for a live service with zero UI change.
 */
export { EnterpriseNotificationProvider, useNotifications } from "./EnterpriseNotificationProvider";
export type { NotificationView, NotificationFilter } from "./EnterpriseNotificationProvider";
export { EnterpriseNotificationBadge } from "./EnterpriseNotificationBadge";
export { EnterpriseNotificationCenter } from "./EnterpriseNotificationCenter";
export type {
  AppNotification,
  NotificationType,
  NotificationSeverity,
  NotificationAction,
} from "./lib/notifications";
