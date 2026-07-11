"use client"
import * as React from "react"
import Link from "next/link"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { buttonVariants } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Progress } from "@/components/ui/progress"
import { Customer } from "@/types"
import { formatINR } from "@/lib/currency"

export type CustomerRow = Customer & {
  code: string
  creditStatus: string
  openInvoices: number
}

export function CustomersList({ data }: { data: CustomerRow[] }) {
  const [selected, setSelected] = React.useState<CustomerRow | null>(null)

  const columns: ColumnDef<CustomerRow>[] = [
    {
      accessorKey: "name",
      header: "Customer Name",
      cell: ({ row }) => (
        <span
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelected(row.original)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "code",
      header: "Code",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("code")}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "On Hold" ? "destructive" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "healthScore",
      header: "Health",
      cell: ({ row }) => {
        const score = row.getValue("healthScore") as number
        return (
          <div className="flex items-center gap-2">
            <Progress value={score} className="w-16 h-2" indicatorClassName={score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-amber-500" : "bg-red-500"} />
            <span className="text-xs font-medium">{score}/100</span>
          </div>
        )
      },
    },
    {
      accessorKey: "outstandingBalance",
      header: () => <div className="text-right">Outstanding</div>,
      cell: ({ row }) => {
        const bal = row.getValue("outstandingBalance") as number
        return <div className={`text-right font-medium ${bal > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>{formatINR(bal)}</div>
      },
    },
    {
      accessorKey: "lastOrderDate",
      header: "Last Order",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("lastOrderDate") || "—"}</span>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader
        title="Customers"
        description="Manage customer relationships, credit standing, and balances."
        actions={<Link href="/sales/customers/new" className={buttonVariants()}>New Customer</Link>}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable columns={columns} data={data} searchPlaceholder="Search customers…" statusKey="status" />
      </div>

      <EntityDrawer
        open={!!selected}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected?.name}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Health Score</span>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={selected?.healthScore || 0} className="w-full h-1.5" indicatorClassName={(selected?.healthScore || 0) >= 80 ? "bg-emerald-500" : (selected?.healthScore || 0) >= 60 ? "bg-amber-500" : "bg-red-500"} />
                <span className="text-sm font-semibold">{selected?.healthScore}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Outstanding Balance</span>
              <span className="font-semibold text-amber-600 dark:text-amber-500">{formatINR(selected?.outstandingBalance || 0)}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Open Invoices</span>
              <span className="font-semibold">{selected?.openInvoices ?? 0}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Credit Status</span>
              <Badge className="w-fit" variant={selected?.creditStatus === "GOOD" ? "default" : "destructive"}>
                {selected?.creditStatus}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium">Summary</div>
          </div>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Customer Code</span>
                <p className="text-sm">{selected?.code}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Last Order</span>
                <p className="text-sm">{selected?.lastOrderDate || "—"}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
