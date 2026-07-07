"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Payable = {
  id: string
  supplier: string
  billRef: string
  dueDate: string
  amount: number
  status: "Open" | "Overdue" | "Scheduled" | "Paid"
}

const mockPayables: Payable[] = [
  { id: "PAY-2026-001", supplier: "Global Supply Co", billRef: "BILL-2026-101", dueDate: "2026-07-20", amount: 45000.00, status: "Scheduled" },
  { id: "PAY-2026-002", supplier: "Tech Parts Ltd", billRef: "BILL-2026-095", dueDate: "2026-07-02", amount: 12500.50, status: "Overdue" },
]

export default function PayablesPage() {
  const columns: ColumnDef<Payable>[] = [
    {
      accessorKey: "id",
      header: "Record ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
    },
    {
      accessorKey: "billRef",
      header: "Bill Ref",
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
          <Badge variant={status === "Paid" ? "default" : status === "Overdue" ? "destructive" : status === "Scheduled" ? "secondary" : "outline"}>
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
        title="Accounts Payable" 
        description="Manage outgoing payments and supplier liabilities."
        actions={<Button>Schedule Payment</Button>}
      />
      
      <FilterBar 
        placeholder="Search payables..." 
        views={["All", "Open", "Scheduled", "Overdue"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockPayables} 
        />
      </div>
    </WorkspaceLayout>
  )
}
