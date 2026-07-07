"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Supplier } from "@/types"
import { mockSuppliers } from "@/app/(dashboard)/_data/procurement"



export default function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = React.useState<Supplier | null>(null)

  const columns: ColumnDef<Supplier>[] = [
    {
      accessorKey: "name",
      header: "Supplier Name",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedSupplier(row.original)}
        >
          {row.getValue("name")}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "Active" ? "default" : status === "Pending Review" ? "warning" : "secondary"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "rating",
      header: "Rating",
      cell: ({ row }) => {
        const rating = row.getValue("rating") as number
        if (rating === 0) return <span className="text-muted-foreground">Unrated</span>
        return <span>⭐ {rating.toFixed(1)}</span>
      }
    },
    {
      accessorKey: "leadTime",
      header: "Avg Lead Time",
      cell: ({ row }) => <span className="text-muted-foreground">{row.getValue("leadTime")}</span>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Suppliers" 
        description="Manage vendor relationships, contracts, and performance ratings."
        actions={<Button>New Supplier</Button>}
      />
      
      <FilterBar 
        placeholder="Search suppliers..." 
        views={["All", "Active", "Pending Review", "Top Rated"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockSuppliers} 
        />
      </div>

      <EntityDrawer
        open={!!selectedSupplier}
        onOpenChange={(open) => !open && setSelectedSupplier(null)}
        title={selectedSupplier?.name}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Rating</span>
              <span className="font-semibold">{selectedSupplier?.rating === 0 ? "N/A" : `⭐ ${selectedSupplier?.rating}`}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Avg Lead Time</span>
              <span className="font-semibold">{selectedSupplier?.leadTime}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedSupplier?.status === "Active" ? "default" : "warning"}>
                {selectedSupplier?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Orders</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Contracts</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">View Ledger</Button>
            <Button variant="outline">Create PO</Button>
            <Button>Edit Supplier</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Supplier Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Supplier ID</span>
                <p className="text-sm">{selectedSupplier?.id}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Category</span>
                <p className="text-sm">{selectedSupplier?.category}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
