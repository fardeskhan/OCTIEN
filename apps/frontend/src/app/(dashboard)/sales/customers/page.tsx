"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Progress } from "@/components/ui/progress"
import { Customer } from "@/types"
import { mockCustomers } from "@/app/(dashboard)/_data/sales"



export default function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = React.useState<Customer | null>(null)

  const columns: ColumnDef<Customer>[] = [
    {
      accessorKey: "name",
      header: "Customer Name",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedCustomer(row.original)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
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
      header: "Health Score",
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
        return <div className={`text-right font-medium ${bal > 0 ? "text-amber-600 dark:text-amber-500" : ""}`}>${bal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
      },
    },
    {
      accessorKey: "lastOrderDate",
      header: "Last Order",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("lastOrderDate")}</span>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Customers" 
        description="Manage customer relationships, health scores, and balances."
        actions={<Button>New Customer</Button>}
      />
      
      <FilterBar 
        placeholder="Search customers..." 
        views={["All", "Active", "B2B Only", "At Risk (Health < 60)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCustomers} 
        />
      </div>

      <EntityDrawer
        open={!!selectedCustomer}
        onOpenChange={(open) => !open && setSelectedCustomer(null)}
        title={selectedCustomer?.name}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Health Score</span>
              <div className="flex items-center gap-2 mt-1">
                <Progress value={selectedCustomer?.healthScore || 0} className="w-full h-1.5" indicatorClassName={(selectedCustomer?.healthScore || 0) >= 80 ? "bg-emerald-500" : (selectedCustomer?.healthScore || 0) >= 60 ? "bg-amber-500" : "bg-red-500"} />
                <span className="text-sm font-semibold">{selectedCustomer?.healthScore}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Outstanding Balance</span>
              <span className="font-semibold text-amber-600 dark:text-amber-500">${(selectedCustomer?.outstandingBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Last Order</span>
              <span className="font-semibold">{selectedCustomer?.lastOrderDate}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedCustomer?.status === "Active" ? "default" : "destructive"}>
                {selectedCustomer?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Orders</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Invoices</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Activity</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">View Ledger</Button>
            <Button variant="outline">Create Order</Button>
            <Button>Edit Customer</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Customer ID</span>
                <p className="text-sm">{selectedCustomer?.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <p className="text-sm">{selectedCustomer?.type}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium mb-4">Health Score Factors</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Payment Behavior</span>
                <Badge variant={selectedCustomer?.healthScore! >= 80 ? "outline" : "destructive"}>
                  {selectedCustomer?.healthScore! >= 80 ? "On Time" : "Usually Late"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Order Frequency</span>
                <span className="text-sm font-medium">Consistent</span>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
