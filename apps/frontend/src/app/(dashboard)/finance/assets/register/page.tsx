"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { KPICard } from "@/components/ui/kpi-card"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { Asset } from "@/types"
import { mockAssets } from "@/app/(dashboard)/_data/finance"



export default function AssetRegisterPage() {
  const [selectedAsset, setSelectedAsset] = React.useState<Asset | null>(null)

  const columns: ColumnDef<Asset>[] = [
    {
      accessorKey: "id",
      header: "Asset ID",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedAsset(row.original)}
        >
          {row.getValue("id")}
        </span>
      ),
    },
    {
      accessorKey: "name",
      header: "Asset Name",
      cell: ({ row }) => <span className="font-medium">{row.getValue("name")}</span>
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "location",
      header: "Location",
    },
    {
      accessorKey: "purchaseCost",
      header: () => <div className="text-right">Purchase Cost</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("purchaseCost") as number).toLocaleString()}</div>,
    },
    {
      accessorKey: "bookValue",
      header: () => <div className="text-right">Net Book Value</div>,
      cell: ({ row }) => <div className="text-right tabular-nums font-medium">${(row.getValue("bookValue") as number).toLocaleString()}</div>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">Active</Badge>
        if (status === "Disposed") return <Badge variant="outline" className="text-muted-foreground">Disposed</Badge>
        return <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">In Repair</Badge>
      }
    },
  ]

  const totalBookValue = mockAssets.filter(a => a.status !== "Disposed").reduce((acc, curr) => acc + curr.bookValue, 0)
  const totalPurchase = mockAssets.filter(a => a.status !== "Disposed").reduce((acc, curr) => acc + curr.purchaseCost, 0)
  const accumulatedDepreciation = totalPurchase - totalBookValue

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Asset Register" 
        description="Master record of all capitalized fixed assets."
        actions={<Button>Acquire Asset</Button>}
      />

      <WorkspaceKPIs>
        <KPICard title="Total Net Book Value" value={`$${(totalBookValue / 1000).toFixed(0)}K`} trend={-1.2} />
        <KPICard title="Accumulated Depreciation" value={`$${(accumulatedDepreciation / 1000).toFixed(0)}K`} trend={5.4} />
        <KPICard title="Active Assets" value="245" />
        <KPICard title="Assets in Repair" value="3" />
      </WorkspaceKPIs>
      
      <FilterBar 
        placeholder="Search assets..." 
        views={["All Active", "Vehicles", "Machinery", "Fully Depreciated"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockAssets} 
        />
      </div>

      <EntityDrawer
        open={!!selectedAsset}
        onOpenChange={(open) => !open && setSelectedAsset(null)}
        title={selectedAsset?.name || "Asset"}
        kpis={
          <>
            <div className="flex flex-col gap-1 border-r border-border px-4 first:pl-0">
              <span className="text-xs text-muted-foreground">Asset ID</span>
              <span className="font-semibold">{selectedAsset?.id}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Net Book Value</span>
              <span className="font-semibold">${selectedAsset?.bookValue.toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 border-r border-border px-4">
              <span className="text-xs text-muted-foreground">Depreciation</span>
              <span className="font-semibold">${(selectedAsset ? selectedAsset.purchaseCost - selectedAsset.bookValue : 0).toLocaleString()}</span>
            </div>
            <div className="flex flex-col gap-1 px-4">
              <span className="text-xs text-muted-foreground">Status</span>
              <Badge className="w-fit" variant={selectedAsset?.status === "Active" ? "default" : "secondary"}>
                {selectedAsset?.status}
              </Badge>
            </div>
          </>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Summary</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Depreciation</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Movements</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Documents</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Audit</div>
          </div>
        }
        actions={
          <>
            <Button variant="outline">Dispose</Button>
            <Button>Edit Asset</Button>
          </>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium mb-4">Asset Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Category</span>
                <p className="text-sm">{selectedAsset?.category}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Location</span>
                <p className="text-sm">{selectedAsset?.location}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Purchase Cost</span>
                <p className="text-sm">${selectedAsset?.purchaseCost.toLocaleString()}</p>
              </div>
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">Useful Life</span>
                <p className="text-sm">5 Years (Straight Line)</p>
              </div>
            </div>
          </div>
          
          <div>
             <h3 className="text-sm font-medium mb-4">Recent Movements</h3>
             <div className="text-sm text-muted-foreground">No recent movements.</div>
          </div>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
