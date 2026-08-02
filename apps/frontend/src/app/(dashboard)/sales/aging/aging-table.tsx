"use client";

import { ColumnDef } from "@tanstack/react-table";
import { EnterpriseDataTable } from "@/components/enterprise";
import { formatINR } from "@/lib/currency";

export interface AgingRow {
  customer: string;
  code: string;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d91_120: number;
  d120plus: number;
  total: number;
  [key: string]: string | number;
}

const money = (key: string, header: string): ColumnDef<AgingRow> => ({
  accessorKey: key,
  header: () => <div className="text-right">{header}</div>,
  cell: ({ row }) => {
    const v = row.getValue(key) as number;
    return <div className="text-right tabular-nums">{v ? formatINR(v) : "—"}</div>;
  },
});

export function AgingTable({ data }: { data: AgingRow[] }) {
  const columns: ColumnDef<AgingRow>[] = [
    { accessorKey: "customer", header: "Customer", cell: ({ row }) => <span className="font-medium">{row.getValue("customer")}</span> },
    money("current", "Current"),
    money("d1_30", "1–30"),
    money("d31_60", "31–60"),
    money("d61_90", "61–90"),
    money("d91_120", "91–120"),
    money("d120plus", "120+"),
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total</div>,
      cell: ({ row }) => <div className="text-right font-semibold tabular-nums">{formatINR(row.getValue("total") as number)}</div>,
    },
  ];

  return <EnterpriseDataTable columns={columns} data={data} searchPlaceholder="Search customers…" />;
}
