"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader, WorkspaceKPIs } from "@/components/layout/workspace-layout"
import { KPICard } from "@/components/ui/kpi-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CollectionExceptionCard } from "@/components/uco/collection-exception-card"
import { DataTable } from "@/components/ui/data-table"

export default function UCOOverviewPage() {
  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="UCO Operations Overview" 
        description="Command center for Used Cooking Oil collection, routing, and processing."
      />
      
      {/* Row 1: Actionable Exceptions */}
      <div className="mt-4 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Action Required</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <CollectionExceptionCard 
            type="Missed Collection"
            title="Route South-B Failed"
            description="Vehicle breakdown. 14 stops missed in South Zone."
            timestamp="1h ago"
            actionRequired="Re-route / Dispatch Backup"
          />
          <CollectionExceptionCard 
            type="Rejected Oil"
            title="High FFA at Source"
            description="Cloud Kitchen A rejected for >15% FFA."
            timestamp="3h ago"
            actionRequired="Review Account"
          />
          <Card className="col-span-1 lg:col-span-2 border-border/50 bg-muted/10 flex flex-col justify-center p-4">
             <div className="flex justify-between w-full text-sm">
                <span className="text-muted-foreground">Pending Collections (Today)</span>
                <span className="font-semibold text-primary">145</span>
             </div>
             <div className="flex justify-between w-full text-sm mt-2">
                <span className="text-muted-foreground">Route Exceptions</span>
                <span className="font-semibold text-amber-500">3</span>
             </div>
          </Card>
        </div>
      </div>

      {/* Row 2: UCO Core KPIs */}
      <div className="mt-6 space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Performance Metrics (MTD)</h2>
        <WorkspaceKPIs>
          <KPICard title="Collected Volume" value="12,450 KG" trend={8.4} />
          <KPICard title="Cost per KG" value="$0.45" trend={-2.1} />
          <KPICard title="Acceptance Rate" value="98.2%" trend={0.5} />
          <KPICard title="Est. Margin" value="32%" trend={1.2} />
        </WorkspaceKPIs>
      </div>

      {/* Row 3: Top Sources & Customers */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Collection Sources</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={[
                { accessorKey: "name", header: "Source" },
                { accessorKey: "vol", header: "Volume (MTD)" },
                { accessorKey: "grade", header: "Grade" }
              ]} 
              data={[
                { name: "Burger King - Main St", vol: "850 KG", grade: "A" },
                { name: "Taj Hotel Kitchen", vol: "1,200 KG", grade: "A" },
                { name: "Spicy Treats Cloud", vol: "420 KG", grade: "B" }
              ]} 
            />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Resale Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <DataTable 
              columns={[
                { accessorKey: "name", header: "Customer" },
                { accessorKey: "type", header: "Industry" },
                { accessorKey: "vol", header: "Purchased (MTD)" }
              ]} 
              data={[
                { name: "EcoDiesel Corp", type: "Biodiesel", vol: "15,000 KG" },
                { name: "Suds & Soap Co", type: "Soap Mfg", vol: "8,500 KG" },
                { name: "Industrial Lubes", type: "Industrial", vol: "2,000 KG" }
              ]} 
            />
          </CardContent>
        </Card>
      </div>

    </WorkspaceLayout>
  )
}
