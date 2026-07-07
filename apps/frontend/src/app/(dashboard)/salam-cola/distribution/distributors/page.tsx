"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { DistributorHealthCard } from "@/components/salam-cola/distributor-health-card"
import { Distributor } from "@/types"
import { mockDistributors } from "@/app/(dashboard)/_data/salam"



export default function DistributorsPage() {
  const [selectedDist, setSelectedDist] = React.useState<Distributor | null>(null)

  const columns: ColumnDef<Distributor>[] = [
    {
      accessorKey: "name",
      header: "Distributor Name",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedDist(row.original)}
        >
          {row.getValue("name")}
        </span>
      )
    },
    {
      accessorKey: "territory",
      header: "Territory",
    },
    {
      accessorKey: "tier",
      header: "Tier",
    },
    {
      accessorKey: "score",
      header: () => <div className="text-right">Health Score</div>,
      cell: ({ row }) => {
        const score = row.getValue("score") as number
        return (
          <div className={`text-right font-medium ${score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-500" : "text-destructive"}`}>
            {score}/100
          </div>
        )
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">View Orders</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Distributor Network" 
        description="Manage Salam Cola distribution partners."
        actions={<Button>Onboard Distributor</Button>}
      />
      
      <FilterBar 
        placeholder="Search distributors..." 
        views={["All Active", "At Risk (<50 Score)", "Platinum Tier"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockDistributors} 
        />
      </div>

      <EntityDrawer
        open={!!selectedDist}
        onOpenChange={(open) => !open && setSelectedDist(null)}
        title={selectedDist?.name || ""}
        kpis={
           <div className="px-4 py-2 w-full max-w-sm">
              <DistributorHealthCard 
                 name={selectedDist?.name || ""}
                 score={selectedDist?.score || 0}
                 salesGrowth={selectedDist?.salesGrowth || 0}
                 coverage={selectedDist?.coverage || 0}
                 outstandingAR={selectedDist?.outstandingAR || 0}
                 orderFrequency={selectedDist?.orderFrequency || ""}
              />
           </div>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Overview</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Orders</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Schemes</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Assets</div>
          </div>
        }
      >
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Recent Activity</h3>
          <p className="text-sm text-muted-foreground">Order history and performance trends will appear here.</p>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
