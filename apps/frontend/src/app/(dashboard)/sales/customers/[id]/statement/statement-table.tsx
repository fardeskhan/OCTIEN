"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EnterpriseDataTable, EnterpriseStatusBadge } from "@/components/enterprise";
import { formatINR } from "@/lib/currency";

export interface StatementRow {
  date: string;
  reference: string;
  type: string;
  debit: number;
  credit: number;
  running: number;
  [key: string]: string | number;
}

export function StatementTable({ data }: { data: StatementRow[] }) {
  const columns: ColumnDef<StatementRow>[] = [
    { accessorKey: "date", header: "Date" },
    { accessorKey: "reference", header: "Reference" },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => <EnterpriseStatusBadge status={row.getValue("type") as string} showIcon={false} />,
    },
    {
      accessorKey: "debit",
      header: () => <div className="text-right">Debit</div>,
      cell: ({ row }) => {
        const v = row.getValue("debit") as number;
        return <div className="text-right tabular-nums">{v ? formatINR(v) : "—"}</div>;
      },
    },
    {
      accessorKey: "credit",
      header: () => <div className="text-right">Credit</div>,
      cell: ({ row }) => {
        const v = row.getValue("credit") as number;
        return <div className="text-right tabular-nums text-success">{v ? formatINR(v) : "—"}</div>;
      },
    },
    {
      accessorKey: "running",
      header: () => <div className="text-right">Running Balance</div>,
      cell: ({ row }) => <div className="text-right font-medium tabular-nums">{formatINR(row.getValue("running") as number)}</div>,
    },
  ];

  return <EnterpriseDataTable columns={columns} data={data} searchPlaceholder="Search transactions…" statusKey="type" />;
}
