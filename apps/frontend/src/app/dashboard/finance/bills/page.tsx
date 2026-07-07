"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

type Bill = {
  id: string
  date: string
  dueDate: string
  supplier: string
  status: "Draft" | "Pending Approval" | "Approved" | "Paid" | "Cancelled"
  total: number
}

const mockBills: Bill[] = [
  { id: "BILL-2026-101", date: "2026-07-06", dueDate: "2026-07-20", supplier: "Global Supply Co", status: "Approved", total: 45000.00 },
  { id: "BILL-2026-100", date: "2026-07-05", dueDate: "2026-07-19", supplier: "Tech Parts Ltd", status: "Pending Approval", total: 12500.50 },
  { id: "BILL-2026-095", date: "2026-06-18", dueDate: "2026-07-02", supplier: "Tech Parts Ltd", status: "Approved", total: 12500.50 },
]

export default function BillsPage() {
  const columns: ColumnDef<Bill>[] = [
    {
      accessorKey: "id",
      header: "Bill ID",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "supplier",
      header: "Supplier",
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
          <Badge variant={status === "Paid" ? "default" : status === "Pending Approval" ? "warning" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">${(row.getValue("total") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Supplier Bills" 
        description="Process vendor invoices and prepare for payment."
        actions={<Button>New Bill</Button>}
      />
      
      <FilterBar 
        placeholder="Search bills..." 
        views={["All", "Pending Approval", "Approved (Unpaid)", "Paid"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockBills} 
        />
      </div>
    </WorkspaceLayout>
  )
}
