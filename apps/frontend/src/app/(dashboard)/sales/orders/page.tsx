"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SalesOrder } from "@/types"
import { mockOrders } from "@/app/(dashboard)/_data/sales"



export default function SalesOrdersPage() {
  const columns: ColumnDef<SalesOrder>[] = [
    {
      accessorKey: "id",
      header: "Order ID",
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
          <Badge variant={status === "Delivered" ? "default" : status === "Cancelled" ? "destructive" : "secondary"}>
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
        title="Sales Orders" 
        description="Manage order pipeline and fulfillment tracking."
        actions={<Button>New Order</Button>}
      />
      
      <FilterBar 
        placeholder="Search orders..." 
        views={["All", "Open Orders", "Processing", "Ready to Ship"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockOrders} 
        />
      </div>
    </WorkspaceLayout>
  )
}
