"use client";

import * as React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { EnterpriseDataTable } from "@/components/enterprise/data";
import { EnterpriseStatusBadge } from "@/components/enterprise/feedback";
import { formatINR } from "@/lib/currency";

export type ReportColumnFormat = "text" | "money" | "number" | "status";

export interface ReportColumn {
  key: string;
  header: string;
  format?: ReportColumnFormat;
}

export type ReportRow = Record<string, string | number>;

/**
 * Config-driven report table — every Sales/Procurement/Inventory/Finance register renders through
 * this one component. Give it a column spec + rows and it builds the table (search, sort,
 * pagination, CSV export, status filter) from the shared `EnterpriseDataTable`.
 */
export function EnterpriseReportTable({
  columns,
  data,
  searchPlaceholder = "Search…",
  statusKey,
}: {
  columns: ReportColumn[];
  data: ReportRow[];
  searchPlaceholder?: string;
  statusKey?: string;
}) {
  const cols: ColumnDef<ReportRow>[] = columns.map((c) => {
    const right = c.format === "money" || c.format === "number";
    return {
      accessorKey: c.key,
      header: () => <div className={right ? "text-right" : ""}>{c.header}</div>,
      cell: ({ row }) => {
        const v = row.getValue(c.key);
        if (c.format === "money") {
          const n = Number(v);
          return <div className="text-right tabular-nums">{n ? formatINR(n) : "—"}</div>;
        }
        if (c.format === "number") {
          return <div className="text-right tabular-nums">{Number(v).toLocaleString("en-IN")}</div>;
        }
        if (c.format === "status") {
          return <EnterpriseStatusBadge status={String(v)} showIcon={false} />;
        }
        return <span>{String(v)}</span>;
      },
    };
  });

  return <EnterpriseDataTable columns={cols} data={data} searchPlaceholder={searchPlaceholder} statusKey={statusKey} />;
}
