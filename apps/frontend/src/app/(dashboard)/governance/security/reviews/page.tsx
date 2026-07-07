"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { AccessReview } from "@/types"
import { mockReviews } from "@/app/(dashboard)/_data/governance"



export default function AccessReviewsPage() {
  const columns: ColumnDef<AccessReview>[] = [
    {
      accessorKey: "campaign",
      header: "Campaign",
      cell: ({ row }) => <span className="font-medium">{row.getValue("campaign")}</span>
    },
    {
      accessorKey: "reviewer",
      header: "Lead Reviewer",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
    },
    {
      accessorKey: "progress",
      header: () => <div className="text-right">Progress</div>,
      cell: ({ row }) => <div className="text-right tabular-nums">{row.getValue("progress")}%</div>
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Completed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>
        if (status === "In Progress") return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">In Progress</Badge>
        return <Badge variant="outline">Pending</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          {row.original.status !== "Completed" && <Button size="sm" variant="ghost">Continue Review</Button>}
          {row.original.status === "Completed" && <Button size="sm" variant="ghost">View Report</Button>}
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Access Reviews" 
        description="Periodic certification of user roles and permissions."
        actions={<Button>Start New Campaign</Button>}
      />
      
      <FilterBar 
        placeholder="Search campaigns..." 
        views={["Active Campaigns", "Past Campaigns"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockReviews} 
        />
      </div>
    </WorkspaceLayout>
  )
}
