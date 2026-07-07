"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { EntityDrawer } from "@/components/layout/drawer-layout"
import { SourceHealthCard } from "@/components/uco/source-health-card"
import { CollectionSource } from "@/types"
import { mockSources } from "@/app/(dashboard)/_data/uco"




export default function UCOSourcesPage() {
  const [selectedSource, setSelectedSource] = React.useState<CollectionSource | null>(null)

  const columns: ColumnDef<CollectionSource>[] = [
    {
      accessorKey: "name",
      header: "Source Name",
      cell: ({ row }) => (
        <span 
          className="font-medium text-primary hover:underline cursor-pointer"
          onClick={() => setSelectedSource(row.original)}
        >
          {row.getValue("name")}
        </span>
      )
    },
    {
      accessorKey: "type",
      header: "Type",
    },
    {
      accessorKey: "zone",
      header: "Zone",
    },
    {
      accessorKey: "volumeKg",
      header: () => <div className="text-right">Volume (MTD)</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("volumeKg")} KG</div>
    },
    {
      accessorKey: "qualityGrade",
      header: "Avg Grade",
      cell: ({ row }) => {
        const grade = row.getValue("qualityGrade") as string
        return (
          <span className={`font-medium ${grade === 'A' ? 'text-emerald-600' : grade === 'Reject' ? 'text-destructive' : ''}`}>
            {grade}
          </span>
        )
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Collection Sources" 
        description="Manage restaurants, hotels, and industrial kitchens providing UCO."
        actions={<Button>Onboard Source</Button>}
      />
      
      <FilterBar 
        placeholder="Search sources..." 
        views={["All Sources", "At Risk", "High Volume (>500KG)"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockSources} 
        />
      </div>

      <EntityDrawer
        open={!!selectedSource}
        onOpenChange={(open) => !open && setSelectedSource(null)}
        title={selectedSource?.name || ""}
        kpis={
           <div className="px-4 py-2 w-full max-w-sm">
              <SourceHealthCard 
                 name={selectedSource?.name || ""}
                 volumeKg={selectedSource?.volumeKg || 0}
                 qualityGrade={selectedSource?.qualityGrade || "A"}
                 growthTrend={selectedSource?.growthTrend || 0}
                 missedPickupPct={selectedSource?.missedPickupPct || 0}
                 frequency={selectedSource?.frequency || ""}
              />
           </div>
        }
        tabs={
          <div className="flex gap-4 border-b border-border mt-4">
            <div className="border-b-2 border-primary pb-2 text-sm font-medium cursor-pointer">Overview</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Collection History</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Quality Tests</div>
            <div className="text-sm text-muted-foreground pb-2 cursor-pointer hover:text-foreground">Financials</div>
          </div>
        }
      >
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Recent Collections</h3>
          <p className="text-sm text-muted-foreground">Detailed history of pickups and oil quality testing for this source will appear here.</p>
        </div>
      </EntityDrawer>
    </WorkspaceLayout>
  )
}
