"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Influencer } from "@/types"
import { mockInfluencers } from "@/app/(dashboard)/_data/salam"



export default function InfluencersPage() {
  const columns: ColumnDef<Influencer>[] = [
    {
      accessorKey: "name",
      header: "Handle / Name",
      cell: ({ row }) => <span className="font-medium text-primary hover:underline cursor-pointer">{row.getValue("name")}</span>
    },
    {
      accessorKey: "platform",
      header: "Platform",
      cell: ({ row }) => <Badge variant="secondary">{row.getValue("platform")}</Badge>
    },
    {
      accessorKey: "followers",
      header: () => <div className="text-right">Followers</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("followers")}</div>
    },
    {
      accessorKey: "engagementRate",
      header: () => <div className="text-right">Engagement</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("engagementRate")}%</div>
    },
    {
      accessorKey: "activeCampaigns",
      header: () => <div className="text-right">Active Campaigns</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("activeCampaigns")}</div>
    },
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Influencer Management" 
        description="Track brand ambassadors and social media partnerships."
        actions={<Button>Add Influencer</Button>}
      />
      
      <FilterBar 
        placeholder="Search influencers..." 
        views={["Top Engagers", "Instagram", "TikTok"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockInfluencers} 
        />
      </div>
    </WorkspaceLayout>
  )
}
