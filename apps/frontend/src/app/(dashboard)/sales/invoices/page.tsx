"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Invoice } from "@/types"
import { mockInvoices } from "@/app/(dashboard)/_data/sales"



export default function InvoicesPage() {
  const columns: ColumnDef<Invoice>[] = [
    {
      accessorKey: "id",
      header: "Invoice #",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("id")}</span>,
    },
    {
      accessorKey: "date",
      header: "Date",
    },
    {
      accessorKey: "customer",
      header: "Customer",
    },
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
      accessorKey: "dueDate",
      header: "Due Date",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const dueDate = row.getValue("dueDate") as string
        return <span className={status === "Overdue" ? "text-destructive font-medium" : ""}>{dueDate}</span>
      }
    },
    {
      accessorKey: "total",
      header: () => <div className="text-right">Total Amount</div>,
      cell: ({ row }) => <div className="text-right font-medium">${(row.getValue("total") as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>,
    },
    {
      accessorKey: "balance",
      header: () => <div className="text-right">Balance Due</div>,
      cell: ({ row }) => {
        const bal = row.getValue("balance") as number
        return <div className={`text-right font-medium ${bal > 0 ? "text-amber-600 dark:text-amber-500" : "text-muted-foreground"}`}>${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      },
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Sales Invoices" 
        description="Manage billing and track customer payments."
        actions={<Button>New Invoice</Button>}
      />
      
      <FilterBar 
        placeholder="Search invoices..." 
        views={["All", "Unpaid", "Overdue", "Drafts"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockInvoices} 
        />
      </div>
    </WorkspaceLayout>
  )
}
