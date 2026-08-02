import * as React from "react";
import {
  FileText,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Circle,
  Truck,
  AlertTriangle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type StatusVariant = "default" | "secondary" | "destructive" | "outline" | "warning";

export interface StatusDef {
  variant: StatusVariant;
  /** Optional display label; defaults to a humanized status. */
  label?: string;
  /** Optional leading icon component (lucide). */
  icon?: React.ComponentType<{ className?: string }>;
}

export type StatusMap = Record<string, StatusDef>;

/**
 * Configuration-driven status registry. Add domain-specific statuses here (or pass a `map`
 * override to the component) WITHOUT touching component logic. Keys are normalized to
 * UPPER_SNAKE, so "Partially Paid", "partially-paid" and "PARTIALLY_PAID" all match.
 */
export const DEFAULT_STATUS_MAP: StatusMap = {
  // Drafts / neutral
  DRAFT: { variant: "secondary", icon: FileText },
  NEW: { variant: "secondary", icon: Circle },
  ISSUED: { variant: "secondary", icon: FileText },
  // In-flight / warning
  SENT: { variant: "warning", icon: Send },
  PENDING: { variant: "warning", icon: Clock },
  OPEN: { variant: "warning", icon: Circle },
  DUE: { variant: "warning", icon: Clock },
  SUBMITTED: { variant: "warning", icon: Send },
  REQUESTED: { variant: "warning", icon: Clock },
  SCHEDULED: { variant: "warning", icon: Clock },
  IN_PROGRESS: { variant: "warning", icon: Clock },
  PROCESSING: { variant: "warning", icon: Clock },
  PARTIALLY_PAID: { variant: "warning", icon: Clock },
  PARTIALLY_FULFILLED: { variant: "warning", icon: Clock },
  ON_HOLD: { variant: "warning", icon: AlertTriangle },
  // Positive / complete
  ACCEPTED: { variant: "default", icon: CheckCircle2 },
  APPROVED: { variant: "default", icon: CheckCircle2 },
  CONFIRMED: { variant: "default", icon: CheckCircle2 },
  PAID: { variant: "default", icon: CheckCircle2 },
  FULFILLED: { variant: "default", icon: CheckCircle2 },
  DELIVERED: { variant: "default", icon: Truck },
  RECEIVED: { variant: "default", icon: CheckCircle2 },
  COMPLETED: { variant: "default", icon: CheckCircle2 },
  CLOSED: { variant: "default", icon: CheckCircle2 },
  POSTED: { variant: "default", icon: CheckCircle2 },
  RECONCILED: { variant: "default", icon: CheckCircle2 },
  ACTIVE: { variant: "default", icon: CheckCircle2 },
  // Negative
  REJECTED: { variant: "destructive", icon: XCircle },
  CANCELLED: { variant: "destructive", icon: XCircle },
  EXPIRED: { variant: "destructive", icon: XCircle },
  VOID: { variant: "destructive", icon: XCircle },
  FAILED: { variant: "destructive", icon: XCircle },
  OVERDUE: { variant: "destructive", icon: AlertTriangle },
  WRITTEN_OFF: { variant: "destructive", icon: XCircle },
  INACTIVE: { variant: "destructive", icon: XCircle },
};

// Keyword fallback for statuses not in the map, so unknown values still get a sensible colour.
const NEGATIVE = /(CANCEL|REJECT|VOID|FAIL|EXPIR|OVERDUE|MISSED|INACTIVE|BLOCK|DECLIN|WRITTEN)/;
const POSITIVE = /(ACCEPT|APPROV|PAID|FULFIL|CONFIRM|RECEIV|ACTIVE|COMPLET|CLOSED|DELIVER|POSTED|DONE|SUCCESS|RECONCIL)/;
const WARN = /(PEND|PARTIAL|HOLD|DUE|SCHEDUL|PROGRESS|PROCESS|REQUEST|SENT|SUBMIT|REVIEW|AWAIT|OPEN)/;

function normalize(status: string): string {
  return status.trim().toUpperCase().replace(/[\s-]+/g, "_");
}

function humanize(status: string): string {
  return status.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolve(status: string, map: StatusMap): StatusDef {
  const key = normalize(status);
  if (map[key]) return map[key];
  if (NEGATIVE.test(key)) return { variant: "destructive" };
  if (POSITIVE.test(key)) return { variant: "default" };
  if (WARN.test(key)) return { variant: "warning" };
  return { variant: "secondary" };
}

export function EnterpriseStatusBadge({
  status,
  variant,
  label,
  map,
  showIcon = true,
  className,
}: {
  status: string;
  /** Force a variant, bypassing the registry. */
  variant?: StatusVariant;
  /** Override the displayed text. */
  label?: string;
  /** Extend/override the default registry for domain-specific statuses. */
  map?: StatusMap;
  showIcon?: boolean;
  className?: string;
}) {
  const merged = map ? { ...DEFAULT_STATUS_MAP, ...map } : DEFAULT_STATUS_MAP;
  const def = resolve(status, merged);
  const Icon = def.icon;
  return (
    <Badge variant={variant ?? def.variant} className={cn(className)}>
      {showIcon && Icon ? <Icon className="size-3" /> : null}
      {label ?? def.label ?? humanize(status)}
    </Badge>
  );
}
