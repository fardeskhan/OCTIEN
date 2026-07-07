"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { BarrelStatusCard } from "@/components/uco/barrel-status-card"
import { KPICard } from "@/components/ui/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Barrel } from "@/types"
import { mockBarrels } from "@/app/(dashboard)/_data/uco"



export default function BarrelTrackingPage() {
  const [selectedBarrel, setSelectedBarrel] = React.useState<Barrel | null>(null)

  const columns: ColumnDef<Barrel>[] = [
    {
      accessorKey: "id",
      header: "Barrel ID",
      cell: ({ row }) => (
        <span 
          className="font-mono text-sm text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedBarrel(row.original)}
        >
          {row.getValue("id")}
        </span>
      )
    },
    {
      accessorKey: "location",
      header: "Current Location",
    },
    {
      accessorKey: "capacity",
      header: () => <div className="text-right">Capacity (L)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("capacity")} L</div>
    },
    {
      accessorKey: "lastCollectionDays",
      header: () => <div className="text-right">Last Collection</div>,
      cell: ({ row }) => {
        const days = row.getValue("lastCollectionDays") as number
        return <div className={`text-right tabular-nums ${days > 30 ? "text-destructive font-medium" : days > 14 ? "text-amber-500 font-medium" : ""}`}>{days} days ago</div>
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Deployed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Deployed</Badge>
        if (status === "In Transit") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">In Transit</Badge>
        if (status === "Processing") return <Badge variant="outline">Processing</Badge>
        return <Badge variant="destructive">{status}</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Barrel Tracking" 
        description="Manage the physical lifecycle and locations of UCO collection barrels."
        actions={<Button>Register Barrels</Button>}
      />
      
      <WorkspaceKPIs>
        <KPICard title="Total Barrels" value="1,050" />
        <KPICard title="Overdue (>30 Days)" value="23" trend={2} />
        <KPICard title="Lost / Damaged" value="11" trend={-1} />
      </WorkspaceKPIs>

      <FilterBar 
        placeholder="Search barrel ID..." 
        views={["All Barrels", "Overdue Collection", "Maintenance Needed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockBarrels} 
        />
      </div>

      <EntityDrawer
        open={!!selectedBarrel}
        onOpenChange={(open) => !open && setSelectedBarrel(null)}
        title={`Barrel Details`}
        kpis={
           <div className="px-4 py-2 w-full max-w-sm">
              <BarrelStatusCard 
                 barrelId={selectedBarrel?.id || ""}
                 status={selectedBarrel?.status || "Deployed"}
                 capacityLiters={selectedBarrel?.capacity || 0}
                 currentLocation={selectedBarrel?.location || ""}
                 daysSinceLastCollection={selectedBarrel?.lastCollectionDays || 0}
              />
           </div>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Movement History</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Maintenance Log</div>
          </div>
        }
      >
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Location pings and collection events will appear here.</p>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
