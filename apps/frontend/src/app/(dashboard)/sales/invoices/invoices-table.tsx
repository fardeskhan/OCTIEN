"use client"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Invoice } from "@/types"
import { formatINR } from "@/lib/currency"

export type InvoiceRow = Invoice & { number: string }

export function InvoicesTable({ data }: { data: InvoiceRow[] }) {
  const columns: ColumnDef<InvoiceRow>[] = [
    {
      accessorKey: "number",
      header: "Invoice #",
      cell: ({ row }) => (
        <Link href={`/sales/invoices/${row.original.id}`} className="font-medium text-primary hover:underline">
          {row.getValue("number")}
        </Link>
      ),
    },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "customer", header: "Customer" },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Paid" ? "default" : status === "Overdue" ? "destructive" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">{formatINR(row.getValue("total") as number)}</div>,
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Balance Due</div>,
      cell: ({ row }) => {
        const bal = row.getValue("balance") as number
        return <div className={`text-right font-medium ${bal > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>{formatINR(bal)}</div>
      },
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Sales Invoices"
        description="Manage billing and track customer payments."
        actions={<Link href="/sales/invoices/new" className={buttonVariants()}>New Invoice</Link>}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search invoices…" statusKey="status" />
      </div>
    </WorkspaceLayout>
  )
}
