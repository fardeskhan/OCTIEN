"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"

type Receivable = {
  id: string
  customer: string
  invoiceRef: string
  dueDate: string
  amount: number
  status: "Open" | "Overdue" | "Disputed" | "Collected"
  daysOverdue: number
}

const mockReceivables: Receivable[] = [
  { id: "REC-2026-001", customer: "Acme Corporation", invoiceRef: "INV-2026-805", dueDate: "2026-08-05", amount: 12500.00, status: "Open", daysOverdue: 0 },
  { id: "REC-2026-002", customer: "Global Retailers Ltd", invoiceRef: "INV-2026-804", dueDate: "2026-07-05", amount: 4500.50, status: "Overdue", daysOverdue: 1 },
  { id: "REC-2026-003", customer: "Midwest Distributors", invoiceRef: "INV-2026-790", dueDate: "2026-06-15", amount: 125000.00, status: "Disputed", daysOverdue: 21 },
]

export default function ReceivablesPage() {
  const [selectedReceivable, setSelectedReceivable] = React.useState<Receivable | null>(null)

  const columns: ColumnDef<Receivable>[] = [
    {
      accessorKey: "id",
      header: "Record ID",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedReceivable(row.original)}
        >
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
    {
      accessorKey: "invoiceRef",
      header: "Invoice Ref",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Collected" ? "default" : status === "Overdue" ? "destructive" : status === "Disputed" ? "warning" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">${(row.getValue("amount") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Accounts Receivable" 
        description="Track incoming payments and manage outstanding balances."
        actions={<Button>Record Payment</Button>}
      />
      
      <FilterBar 
        placeholder="Search receivables..." 
        views={["All", "Open", "Overdue", "Disputed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockReceivables} 
          renderBulkActions={(selected) => (
            <>
              <Button variant="secondary" size="sm">Send Reminder</Button>
              <Button variant="outline" size="sm">Export Data</Button>
            </>
          )}
        />
      </div>

      <EntityDrawer
        open={!!selectedReceivable}
        onOpenChange={(open) => !open && setSelectedReceivable(null)}
        title={`Receivable: ${selectedReceivable?.id}`}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Amount Due</span>
              <span className="font-semibold text-amber-600 dark:text-amber-500">${selectedReceivable?.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Days Overdue</span>
              <span className="font-semibold text-destructive">{(selectedReceivable?.daysOverdue ?? 0) > 0 ? selectedReceivable?.daysOverdue : "-"}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedReceivable?.status === "Overdue" ? "destructive" : "secondary"}>
                {selectedReceivable?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Communications</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Ledger Entries</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">Dispute</Button>
            <Button>Record Payment</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Customer</span>
                <p className="text-sm">{selectedReceivable?.customer}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Invoice Reference</span>
                <p className="text-sm text-primary underline cursor-pointer">{selectedReceivable?.invoiceRef}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
