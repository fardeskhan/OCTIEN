"use client"
import * as React from "react"
import { WorkspaceLayout, WorkspaceHeader } from "@/components/layout/workspace-layout"
import { FilterBar } from "@/components/ui/filter-bar"
import { DataTable } from "@/components/ui/data-table"
import { ColumnDef } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ComplianceTask } from "@/types"
import { mockTasks } from "@/app/(dashboard)/_data/governance"



export default function ComplianceTasksPage() {
  const columns: ColumnDef<ComplianceTask>[] = [
    {
      accessorKey: "task",
      header: "Regulatory Task",
      cell: ({ row }) => <span className="font-medium">{row.getValue("task")}</span>
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "dueDate",
      header: "Due Date",
    },
    {
      accessorKey: "assignedTo",
      header: "Assigned To",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        if (status === "Completed") return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Completed</Badge>
        if (status === "Overdue") return <Badge variant="destructive">Overdue</Badge>
        return <Badge variant="secondary">Pending</Badge>
      }
    },
    {
      id: "actions",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost">Update Status</Button>
        </div>
      )
    }
  ]

  return (
    <WorkspaceLayout>
      <WorkspaceHeader 
        title="Regulatory Tasks" 
        description="Calendar and tracking for statutory and regulatory obligations."
        actions={<Button>Add Task</Button>}
      />
      
      <FilterBar 
        placeholder="Search tasks..." 
        views={["Upcoming", "Overdue", "My Tasks"]}
      />

      <div className="flex-1 overflow-hidden mt-4">
        <DataTable 
          columns={columns} 
          data={mockTasks} 
        />
      </div>
    </WorkspaceLayout>
  )
}
