"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Campaign } from "@/types"
import { mockCampaigns } from "@/app/(dashboard)/_data/salam"



export default function CampaignsPage() {
  const columns: ColumnDef<Campaign>[] = [
    {
      accessorKey: "name",
      header: "Campaign Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "budget",
      header: () => <div className="text-right">Budget</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("budget") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "spend",
      header: () => <div className="text-right">Spend</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">${(row.getValue("spend") as number).toLocaleString()}</div>
    },
    {
      accessorKey: "reach",
      header: () => <div className="text-right">Est. Reach</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("reach")}</div>
    },
    {
      accessorKey: "roi",
      header: () => <div className="text-right">ROI (%)</div>,
      cell: ({ row }) => {
        const roi = row.getValue("roi") as number
        if (roi === 0) return <div className="text-right text-muted-foreground">-</div>
        return <div className={`text-right font-medium ${roi > 200 ? "text-emerald-600" : "text-primary"}`}>{roi}%</div>
      }
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Active") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Active</Badge>
        if (status === "Planned") return <Badge variant="secondary">Planned</Badge>
        return <Badge variant="outline" className="text-muted-foreground">Completed</Badge>
      }
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Marketing Campaigns" 
        description="Track FMCG campaign performance, budget, and ROI."
        actions={<Button>Create Campaign</Button>}
      />
      
      <FilterBar 
        placeholder="Search campaigns..." 
        views={["Active Campaigns", "High ROI", "Completed"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockCampaigns} 
        />
      </div>
    </WorkspaceLayout>
  )
}
