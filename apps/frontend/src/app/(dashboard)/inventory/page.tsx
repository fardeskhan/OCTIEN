"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { StockLevel } from "@/types"
import { mockStock } from "@/app/(dashboard)/_data/inventory"



export default function InventoryPage() {
  const [selectedStock, setSelectedStock] = React.useState<StockLevel | null>(null)

  const columns: ColumnDef<StockLevel>[] = [
    {
      accessorKey: "productCode",
      header: "Code",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedStock(row.original)}
        >
          {row.getValue("productCode")}
        </span>
      ),
    },
    {
      accessorKey: "productName",
      header: "Product Name",
    },
    {
      accessorKey: "warehouse",
      header: "Warehouse",
    },
    {
      accessorKey: "zone",
      header: "Zone/Bin",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        return (
          <Badge variant={status === "In Stock" ? "default" : status === "Low Stock" ? "warning" : "destructive"}>
            {status}
          </Badge>
        )
      }
    },
    {
      accessorKey: "available",
      header: () => <div className="text-right">Available</div>,
      cell: ({ row }) => <div className="text-right font-medium">{row.getValue("available")}</div>,
    },
    {
      accessorKey: "onHand",
      header: () => <div className="text-right">On Hand</div>,
      cell: ({ row }) => <div className="text-right text-muted-foreground">{row.getValue("onHand")}</div>,
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Inventory" 
        description="Monitor real-time stock levels across all locations."
        actions={<Button>Adjust Stock</Button>}
      />
      
      <FilterBar 
        placeholder="Search stock..." 
        views={["All Locations", "Main WH", "Low Stock", "Out of Stock"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockStock} 
        />
      </div>

      <EntityDrawer
        open={!!selectedStock}
        onOpenChange={(open) => !open && setSelectedStock(null)}
        title={`${selectedStock?.productCode} at ${selectedStock?.warehouse}`}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Available</span>
              <span className="font-semibold text-primary">{selectedStock?.available}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Allocated</span>
              <span className="font-semibold">{selectedStock?.allocated}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">On Hand</span>
              <span className="font-semibold">{selectedStock?.onHand}</span>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium">Summary</div>
            <div className="text-sm text-muted-foreground pb-2">Allocations</div>
            <div className="text-sm text-muted-foreground pb-2">Movement History</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">Transfer</Button>
            <Button>Adjust</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Location Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Warehouse</span>
                <p className="text-sm">{selectedStock?.warehouse}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Zone/Bin</span>
                <p className="text-sm">{selectedStock?.zone}</p>
              </div>
            </div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
